import type { Timestamp } from '../domain/entities';
import { ConflictError, ValidationError } from '../domain/errors';
import type { GiftTrackerDatabase } from '../storage/db';
import { linkDevice, readSyncLink } from '../storage/syncLink';
import {
  type SyncConflict,
  type SyncEntity,
  type SyncEntityType,
  type SyncOutboxEntry,
} from '../storage/syncTypes';
import type { CloudMirror, CloudRow } from './cloud';
import type { SyncEngineContext, SyncRunSummary } from './engine';
import { syncNow } from './engine';
import {
  countLocalPlans,
  parseCloudEntity,
  putLocalEntity,
  readAllLocalEntities,
  stableStringify,
} from './entities';

const SNAPSHOT_PAGE_SIZE = 500;

export const CONNECT_CONFIRMATION = 'CONNECT';

export type ConnectionMode = 'upload' | 'download' | 'merge';

export interface ConnectionPlan {
  mode: ConnectionMode;
  localRecords: number;
  cloudRecords: number;
  identical: number;
  localOnly: number;
  cloudOnly: number;
  conflicts: number;
}

export interface ConnectAccountInput {
  userId: string;
  email: string | null;
  confirmation: string;
  backupTaken: boolean;
}

export interface ConnectAccountResult {
  plan: ConnectionPlan;
  summary: SyncRunSummary;
}

async function readCloudSnapshot(adapter: CloudMirror): Promise<CloudRow[]> {
  const rows: CloudRow[] = [];
  let cursor = 0;

  while (true) {
    const page = await adapter.listChanges(cursor, SNAPSHOT_PAGE_SIZE);
    if (page.length === 0) {
      break;
    }

    rows.push(...page);
    const nextCursor = page.reduce((max, row) => Math.max(max, row.seq), cursor);
    if (nextCursor <= cursor) {
      break;
    }
    cursor = nextCursor;

    if (page.length < SNAPSHOT_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

function recordKey(entityType: SyncEntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function entityKey(entityType: SyncEntityType, entity: SyncEntity): string {
  return recordKey(entityType, entityType === 'settings' ? 'app' : entity.id);
}

interface PlanDetails {
  plan: ConnectionPlan;
  cloudRows: CloudRow[];
}

async function buildPlan(db: GiftTrackerDatabase, adapter: CloudMirror): Promise<PlanDetails> {
  const [localRecords, localPlans, cloudRows] = await Promise.all([
    readAllLocalEntities(db),
    countLocalPlans(db),
    readCloudSnapshot(adapter),
  ]);

  const localByKey = new Map(
    localRecords.map(({ entityType, entity }) => [
      entityKey(entityType, entity),
      { entityType, entity },
    ]),
  );
  const cloudByKey = new Map(
    cloudRows.map((row) => [recordKey(row.entityType, row.entityId), row]),
  );

  let identical = 0;
  let localOnly = 0;
  let cloudOnly = 0;
  let conflicts = 0;

  for (const [key, local] of localByKey) {
    const remote = cloudByKey.get(key);

    if (!remote) {
      localOnly += 1;
      continue;
    }

    if (remote.deleted) {
      conflicts += 1;
      continue;
    }

    try {
      const remoteEntity = parseCloudEntity(remote.entityType, remote.data);
      if (stableStringify(remoteEntity) === stableStringify(local.entity)) {
        identical += 1;
      } else {
        conflicts += 1;
      }
    } catch {
      conflicts += 1;
    }
  }

  for (const [key, remote] of cloudByKey) {
    if (!localByKey.has(key) && !remote.deleted) {
      cloudOnly += 1;
    }
  }

  const mode: ConnectionMode =
    cloudRows.length === 0 ? 'upload' : localPlans === 0 ? 'download' : 'merge';

  return {
    plan: {
      mode,
      localRecords: localRecords.length,
      cloudRecords: cloudRows.length,
      identical,
      localOnly,
      cloudOnly,
      conflicts,
    },
    cloudRows,
  };
}

export async function planConnection(
  db: GiftTrackerDatabase,
  adapter: CloudMirror,
): Promise<ConnectionPlan> {
  const details = await buildPlan(db, adapter);
  return details.plan;
}

async function queueLocalRecords(
  db: GiftTrackerDatabase,
  records: Array<{ entityType: SyncEntityType; entity: SyncEntity }>,
  at: Timestamp,
): Promise<void> {
  if (records.length === 0) {
    return;
  }

  const entries: SyncOutboxEntry[] = records.map(({ entityType, entity }) => ({
    entityType,
    entityId: entityType === 'settings' ? 'app' : entity.id,
    queuedAt: at,
    attempts: 0,
    lastError: null,
  }));

  await db.syncOutbox.bulkPut(entries);
}

async function saveSyncedState(
  db: GiftTrackerDatabase,
  entityType: SyncEntityType,
  entityId: string,
  revision: number,
  at: Timestamp,
): Promise<void> {
  await db.syncState.put({
    entityType,
    entityId,
    serverRevision: revision,
    syncedAt: at,
    lastError: null,
  });
}

async function mergeSnapshot(
  db: GiftTrackerDatabase,
  details: PlanDetails,
  at: Timestamp,
): Promise<void> {
  const localRecords = await readAllLocalEntities(db);
  const localByKey = new Map(
    localRecords.map(({ entityType, entity }) => [
      entityKey(entityType, entity),
      { entityType, entity },
    ]),
  );

  const toUpload: Array<{ entityType: SyncEntityType; entity: SyncEntity }> = [];
  const toApply: Array<{ row: CloudRow; entity: SyncEntity }> = [];
  const identical: Array<{ row: CloudRow }> = [];
  const conflicts: SyncConflict[] = [];

  for (const [key, local] of localByKey) {
    const remote = details.cloudRows.find((row) => recordKey(row.entityType, row.entityId) === key);

    if (!remote) {
      toUpload.push(local);
      continue;
    }

    if (remote.deleted) {
      conflicts.push({
        entityType: local.entityType,
        entityId: remote.entityId,
        kind: 'delete',
        localData: local.entity,
        remoteData: null,
        remoteDeleted: true,
        remoteRevision: remote.revision,
        detectedAt: at,
      });
      continue;
    }

    let remoteEntity: SyncEntity;
    try {
      remoteEntity = parseCloudEntity(remote.entityType, remote.data);
    } catch {
      conflicts.push({
        entityType: local.entityType,
        entityId: remote.entityId,
        kind: 'update',
        localData: local.entity,
        remoteData: null,
        remoteDeleted: false,
        remoteRevision: remote.revision,
        detectedAt: at,
      });
      continue;
    }

    if (stableStringify(remoteEntity) === stableStringify(local.entity)) {
      identical.push({ row: remote });
    } else {
      conflicts.push({
        entityType: local.entityType,
        entityId: remote.entityId,
        kind: 'update',
        localData: local.entity,
        remoteData: remoteEntity,
        remoteDeleted: false,
        remoteRevision: remote.revision,
        detectedAt: at,
      });
    }
  }

  for (const row of details.cloudRows) {
    const key = recordKey(row.entityType, row.entityId);
    if (localByKey.has(key) || row.deleted) {
      continue;
    }

    try {
      toApply.push({ row, entity: parseCloudEntity(row.entityType, row.data) });
    } catch {
      // An unreadable cloud row is skipped so the merge keeps moving; the
      // next full sync reports it through the link error.
    }
  }

  await db.transaction(
    'rw',
    [
      db.seasons,
      db.recipients,
      db.gifts,
      db.ideas,
      db.settings,
      db.syncOutbox,
      db.syncState,
      db.syncConflicts,
    ],
    async () => {
      for (const { row, entity } of toApply) {
        await putLocalEntity(db, row.entityType, entity);
        await saveSyncedState(db, row.entityType, row.entityId, row.revision, at);
      }

      for (const { row } of identical) {
        await saveSyncedState(db, row.entityType, row.entityId, row.revision, at);
      }

      for (const conflict of conflicts) {
        await db.syncConflicts.put(conflict);
      }

      await queueLocalRecords(db, toUpload, at);
    },
  );
}

export async function connectAccount(
  ctx: SyncEngineContext,
  input: ConnectAccountInput,
): Promise<ConnectAccountResult> {
  const { db, adapter } = ctx;
  const existing = await readSyncLink(db);

  if (existing && existing.userId !== input.userId) {
    throw new ConflictError(
      'This device is already linked to a different account.',
      'Open Account and disconnect this device before connecting another account. Disconnecting keeps your local plans.',
    );
  }

  if (input.confirmation.trim() !== CONNECT_CONFIRMATION) {
    throw new ValidationError(
      `Type ${CONNECT_CONFIRMATION} to connect this device to an account.`,
      [
        {
          path: 'confirmation',
          message: `The connection confirmation must be exactly ${CONNECT_CONFIRMATION}.`,
        },
      ],
    );
  }

  if (existing) {
    return {
      plan: await planConnection(db, adapter),
      summary: await syncNow(ctx),
    };
  }

  const details = await buildPlan(db, adapter);

  if (details.plan.mode === 'merge' && !input.backupTaken) {
    throw new ValidationError(
      'Download a fresh backup before merging this device with the account.',
      [
        {
          path: 'backupTaken',
          message: 'The merge confirmation requires a downloaded backup.',
        },
      ],
    );
  }

  await linkDevice(db, {
    userId: input.userId,
    email: input.email,
    at: ctx.nowIso(),
  });

  if (details.plan.mode === 'upload') {
    const records = await readAllLocalEntities(db);
    await queueLocalRecords(db, records, ctx.nowIso());
  } else if (details.plan.mode === 'download') {
    const records = await readAllLocalEntities(db);
    const cloudHasSettings = details.cloudRows.some(
      (row) => row.entityType === 'settings' && !row.deleted,
    );

    if (!cloudHasSettings) {
      await queueLocalRecords(
        db,
        records.filter(({ entityType }) => entityType === 'settings'),
        ctx.nowIso(),
      );
    }
  } else {
    await mergeSnapshot(db, details, ctx.nowIso());
  }

  const summary = await syncNow(ctx);

  return { plan: details.plan, summary };
}
