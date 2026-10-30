import type { Timestamp } from '../domain/entities';
import { SyncError } from '../domain/errors';
import type { GiftTrackerDatabase } from '../storage/db';
import { readSyncLink } from '../storage/syncLink';
import {
  syncKey,
  type SyncConflict,
  type SyncEntity,
  type SyncEntityType,
  type SyncGlobalState,
  type SyncLink,
  type SyncStatusSnapshot,
} from '../storage/syncTypes';
import { timestampsEqual, type CloudMirror, type CloudRow, type CloudWriteResult } from './cloud';
import {
  DELETE_ORDER,
  deleteLocalEntity,
  parseCloudEntity,
  putLocalEntity,
  readLocalEntity,
  stableStringify,
  UPLOAD_ORDER,
} from './entities';

const PULL_PAGE_SIZE = 200;

export interface SyncEngineContext {
  db: GiftTrackerDatabase;
  adapter: CloudMirror;
  nowIso: () => Timestamp;
}

export interface SyncRunSummary {
  pushed: number;
  pulled: number;
  conflicts: number;
  pending: number;
}

interface PushSummary {
  pushed: number;
  conflicts: number;
}

interface PullSummary {
  pulled: number;
  conflicts: number;
  unreadable: number;
}

const ALL_SYNC_TABLES = (db: GiftTrackerDatabase) => [
  db.seasons,
  db.recipients,
  db.gifts,
  db.ideas,
  db.settings,
  db.syncState,
  db.syncOutbox,
  db.syncTombstones,
  db.syncConflicts,
  db.syncMeta,
];

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 300);
  }
  return 'Sync failed.';
}

function orderIndex(order: readonly SyncEntityType[], entityType: SyncEntityType): number {
  const index = order.indexOf(entityType);
  return index === -1 ? order.length : index;
}

function isUpsertReplay(
  remote: CloudRow | null,
  baseRevision: number,
  entity: SyncEntity,
): boolean {
  return (
    remote !== null &&
    !remote.deleted &&
    remote.revision === baseRevision + 1 &&
    timestampsEqual(remote.updatedAt, entity.updatedAt) &&
    stableStringify(remote.data) === stableStringify(entity)
  );
}

function isDeleteReplay(
  remote: CloudRow | null,
  baseRevision: number,
  deletedAt: Timestamp,
): boolean {
  return (
    remote !== null &&
    remote.deleted &&
    remote.revision === baseRevision + 1 &&
    timestampsEqual(remote.updatedAt, deletedAt)
  );
}

async function markEntryFailure(
  db: GiftTrackerDatabase,
  entityType: SyncEntityType,
  entityId: string,
  operation: 'upsert' | 'delete',
  error: unknown,
): Promise<void> {
  const key = syncKey(entityType, entityId);
  const message = errorMessage(error);

  await db.transaction('rw', [db.syncOutbox, db.syncTombstones, db.syncMeta], async () => {
    if (operation === 'upsert') {
      const entry = await db.syncOutbox.get(key);
      if (entry) {
        await db.syncOutbox.put({ ...entry, attempts: entry.attempts + 1, lastError: message });
      }
    } else {
      const entry = await db.syncTombstones.get(key);
      if (entry) {
        await db.syncTombstones.put({ ...entry, attempts: entry.attempts + 1, lastError: message });
      }
    }

    const link = await db.syncMeta.get('link');
    if (link) {
      await db.syncMeta.put({ ...link, lastError: message });
    }
  });
}

async function saveState(
  db: GiftTrackerDatabase,
  entityType: SyncEntityType,
  entityId: string,
  revision: number,
  syncedAt: Timestamp,
): Promise<void> {
  await db.syncState.put({
    entityType,
    entityId,
    serverRevision: revision,
    syncedAt,
    lastError: null,
  });
}

export async function pushPendingChanges(ctx: SyncEngineContext): Promise<PushSummary> {
  const { db } = ctx;
  const link = await readSyncLink(db);

  if (!link) {
    return { pushed: 0, conflicts: 0 };
  }

  const outbox = (await db.syncOutbox.toArray()).sort(
    (left, right) =>
      orderIndex(UPLOAD_ORDER, left.entityType) - orderIndex(UPLOAD_ORDER, right.entityType),
  );
  const tombstones = (await db.syncTombstones.toArray()).sort(
    (left, right) =>
      orderIndex(DELETE_ORDER, left.entityType) - orderIndex(DELETE_ORDER, right.entityType),
  );

  let pushed = 0;
  let conflicts = 0;

  for (const entry of outbox) {
    const key = syncKey(entry.entityType, entry.entityId);
    const entity = await readLocalEntity(db, entry.entityType, entry.entityId);

    if (!entity) {
      await db.syncOutbox.delete(key);
      continue;
    }

    const state = await db.syncState.get(key);
    const baseRevision = state?.serverRevision ?? 0;
    let result: CloudWriteResult;

    try {
      result = await ctx.adapter.upsert({
        entityType: entry.entityType,
        entityId: entry.entityId,
        baseRevision,
        data: entity,
        updatedAt: entity.updatedAt,
      });
    } catch (error) {
      await markEntryFailure(db, entry.entityType, entry.entityId, 'upsert', error);
      throw new SyncError('Pending changes could not be uploaded.', { cause: error });
    }

    const now = ctx.nowIso();

    if (result.status === 'applied') {
      await db.transaction('rw', [db.syncOutbox, db.syncState], async () => {
        await db.syncOutbox.delete(key);
        await saveState(db, entry.entityType, entry.entityId, result.revision, now);
      });
      pushed += 1;
      continue;
    }

    if (isUpsertReplay(result.remote, baseRevision, entity)) {
      await db.transaction('rw', [db.syncOutbox, db.syncState], async () => {
        await db.syncOutbox.delete(key);
        await saveState(db, entry.entityType, entry.entityId, result.remote!.revision, now);
      });
      pushed += 1;
      continue;
    }

    let remoteData: SyncEntity | null = null;
    if (result.remote && !result.remote.deleted) {
      try {
        remoteData = parseCloudEntity(entry.entityType, result.remote.data);
      } catch (error) {
        await markEntryFailure(db, entry.entityType, entry.entityId, 'upsert', error);
        throw new SyncError('A conflicting cloud record could not be read.', { cause: error });
      }
    }

    const conflict: SyncConflict = {
      entityType: entry.entityType,
      entityId: entry.entityId,
      kind: 'update',
      localData: entity,
      remoteData,
      remoteDeleted: result.remote?.deleted ?? false,
      remoteRevision: result.remote?.revision ?? 0,
      detectedAt: now,
    };

    await db.transaction('rw', [db.syncOutbox, db.syncState, db.syncConflicts], async () => {
      await db.syncOutbox.delete(key);
      await saveState(db, entry.entityType, entry.entityId, conflict.remoteRevision, now);
      await db.syncConflicts.put(conflict);
    });
    conflicts += 1;
  }

  for (const entry of tombstones) {
    const key = syncKey(entry.entityType, entry.entityId);
    const state = await db.syncState.get(key);
    const baseRevision = state?.serverRevision ?? 0;
    let result: CloudWriteResult;

    if (entry.entityType === 'settings') {
      await db.syncTombstones.delete(key);
      continue;
    }

    try {
      result = await ctx.adapter.delete({
        entityType: entry.entityType,
        entityId: entry.entityId,
        baseRevision,
        deletedAt: entry.deletedAt,
      });
    } catch (error) {
      await markEntryFailure(db, entry.entityType, entry.entityId, 'delete', error);
      throw new SyncError('Pending deletions could not be uploaded.', { cause: error });
    }

    const now = ctx.nowIso();

    if (result.status === 'applied') {
      await db.transaction('rw', [db.syncTombstones, db.syncState], async () => {
        await db.syncTombstones.delete(key);
        await saveState(db, entry.entityType, entry.entityId, result.revision, now);
      });
      pushed += 1;
      continue;
    }

    if (isDeleteReplay(result.remote, baseRevision, entry.deletedAt) || result.remote?.deleted) {
      // Both sides deleted the record; there is nothing left to disagree about.
      await db.transaction('rw', [db.syncTombstones, db.syncState], async () => {
        await db.syncTombstones.delete(key);
        await saveState(db, entry.entityType, entry.entityId, result.remote!.revision, now);
      });
      pushed += 1;
      continue;
    }

    let remoteData: SyncEntity | null = null;
    if (result.remote && !result.remote.deleted) {
      try {
        remoteData = parseCloudEntity(entry.entityType, result.remote.data);
      } catch (error) {
        await markEntryFailure(db, entry.entityType, entry.entityId, 'delete', error);
        throw new SyncError('A conflicting cloud record could not be read.', { cause: error });
      }
    }

    const conflict: SyncConflict = {
      entityType: entry.entityType,
      entityId: entry.entityId,
      kind: 'delete',
      localData: null,
      remoteData,
      remoteDeleted: result.remote?.deleted ?? false,
      remoteRevision: result.remote?.revision ?? 0,
      detectedAt: now,
    };

    await db.transaction('rw', [db.syncTombstones, db.syncState, db.syncConflicts], async () => {
      await db.syncTombstones.delete(key);
      await saveState(db, entry.entityType, entry.entityId, conflict.remoteRevision, now);
      await db.syncConflicts.put(conflict);
    });
    conflicts += 1;
  }

  return { pushed, conflicts };
}

export async function pullChanges(ctx: SyncEngineContext): Promise<PullSummary> {
  const { db } = ctx;
  const link = await readSyncLink(db);

  if (!link) {
    return { pulled: 0, conflicts: 0, unreadable: 0 };
  }

  let cursor = link.lastServerSeq;
  let pulled = 0;
  let conflicts = 0;
  let unreadable = 0;

  while (true) {
    let rows: CloudRow[];

    try {
      rows = await ctx.adapter.listChanges(cursor, PULL_PAGE_SIZE);
    } catch (error) {
      throw new SyncError('The latest cloud changes could not be downloaded.', { cause: error });
    }

    if (rows.length === 0) {
      break;
    }

    const prepared = rows.map((row) => {
      if (row.deleted) {
        return { row, remote: null as SyncEntity | null, invalid: false };
      }

      try {
        return { row, remote: parseCloudEntity(row.entityType, row.data), invalid: false };
      } catch {
        return { row, remote: null as SyncEntity | null, invalid: true };
      }
    });

    const ordered = [
      ...prepared.filter((item) => item.row.entityType !== 'settings'),
      ...prepared.filter((item) => item.row.entityType === 'settings'),
    ];
    const now = ctx.nowIso();
    const batchCursor = rows.reduce((max, row) => Math.max(max, row.seq), cursor);

    await db.transaction('rw', ALL_SYNC_TABLES(db), async () => {
      for (const item of ordered) {
        const { row } = item;

        if (item.invalid) {
          unreadable += 1;
          continue;
        }

        const key = syncKey(row.entityType, row.entityId);

        if (await db.syncConflicts.get(key)) {
          continue;
        }

        const outboxEntry = await db.syncOutbox.get(key);
        const tombstone = await db.syncTombstones.get(key);

        if (tombstone) {
          if (row.deleted) {
            await db.syncTombstones.delete(key);
            await saveState(db, row.entityType, row.entityId, row.revision, now);
            continue;
          }

          await db.syncConflicts.put({
            entityType: row.entityType,
            entityId: row.entityId,
            kind: 'delete',
            localData: null,
            remoteData: item.remote,
            remoteDeleted: false,
            remoteRevision: row.revision,
            detectedAt: now,
          });
          conflicts += 1;
          continue;
        }

        if (outboxEntry) {
          const localData = await readLocalEntity(db, row.entityType, row.entityId);
          const state = await db.syncState.get(key);

          if (
            !row.deleted &&
            localData &&
            isUpsertReplay(row, state?.serverRevision ?? 0, localData)
          ) {
            await db.syncOutbox.delete(key);
            await saveState(db, row.entityType, row.entityId, row.revision, now);
            continue;
          }

          await db.syncConflicts.put({
            entityType: row.entityType,
            entityId: row.entityId,
            kind: 'update',
            localData,
            remoteData: item.remote,
            remoteDeleted: row.deleted,
            remoteRevision: row.revision,
            detectedAt: now,
          });
          conflicts += 1;
          continue;
        }

        if (row.deleted) {
          await deleteLocalEntity(db, row.entityType, row.entityId);
        } else if (item.remote) {
          await putLocalEntity(db, row.entityType, item.remote);
        }

        await saveState(db, row.entityType, row.entityId, row.revision, now);
        pulled += 1;
      }

      const current = await db.syncMeta.get('link');
      if (current) {
        await db.syncMeta.put({
          ...current,
          lastServerSeq: batchCursor,
          lastError:
            unreadable > 0
              ? 'Some cloud records could not be read and were skipped.'
              : current.lastError,
        });
      }
    });

    if (batchCursor <= cursor) {
      break;
    }

    cursor = batchCursor;

    if (rows.length < PULL_PAGE_SIZE) {
      break;
    }
  }

  return { pulled, conflicts, unreadable };
}

export async function countPendingChanges(db: GiftTrackerDatabase): Promise<number> {
  const [outbox, tombstones] = await Promise.all([
    db.syncOutbox.count(),
    db.syncTombstones.count(),
  ]);

  return outbox + tombstones;
}

export async function syncNow(ctx: SyncEngineContext): Promise<SyncRunSummary> {
  const { db } = ctx;
  const link = await readSyncLink(db);

  if (!link) {
    return { pushed: 0, pulled: 0, conflicts: 0, pending: 0 };
  }

  const pushed = await pushPendingChanges(ctx);
  const pulled = await pullChanges(ctx);
  const now = ctx.nowIso();

  const linkError =
    pulled.unreadable > 0 ? 'Some cloud records could not be read and were skipped.' : null;

  await db.transaction('rw', [db.syncMeta], async () => {
    const current = await db.syncMeta.get('link');
    if (current) {
      await db.syncMeta.put({ ...current, lastSyncedAt: now, lastError: linkError });
    }
  });

  return {
    pushed: pushed.pushed,
    pulled: pulled.pulled,
    conflicts: pushed.conflicts + pulled.conflicts,
    pending: await countPendingChanges(db),
  };
}

export interface SyncStatusOptions {
  online: boolean;
}

export async function getSyncStatus(
  db: GiftTrackerDatabase,
  options: SyncStatusOptions,
): Promise<SyncStatusSnapshot> {
  const link: SyncLink | null = await readSyncLink(db);
  const [pendingCount, conflictCount] = await Promise.all([
    countPendingChanges(db),
    db.syncConflicts.count(),
  ]);

  if (!link) {
    return {
      state: 'local' as SyncGlobalState,
      message: null,
      email: null,
      pendingCount,
      conflictCount,
      lastSyncedAt: null,
    };
  }

  const base = {
    email: link.email,
    pendingCount,
    conflictCount,
    lastSyncedAt: link.lastSyncedAt,
  };

  if (conflictCount > 0) {
    return {
      ...base,
      state: 'conflict',
      message: `${conflictCount} ${conflictCount === 1 ? 'record needs' : 'records need'} your decision.`,
    };
  }

  if (!options.online) {
    return {
      ...base,
      state: 'offline',
      message: 'Offline. Changes are saved on this device and will sync when you reconnect.',
    };
  }

  if (link.lastError) {
    return { ...base, state: 'error', message: link.lastError };
  }

  if (pendingCount > 0) {
    return {
      ...base,
      state: 'pending',
      message: `${pendingCount} ${pendingCount === 1 ? 'change is' : 'changes are'} waiting to sync.`,
    };
  }

  if (link.lastSyncedAt) {
    return { ...base, state: 'synced', message: null };
  }

  return { ...base, state: 'idle', message: null };
}
