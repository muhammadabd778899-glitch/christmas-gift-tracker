import { NotFoundError, SyncError } from '../domain/errors';
import type { GiftTrackerDatabase } from '../storage/db';
import { syncKey, type SyncEntityType } from '../storage/syncTypes';
import type { SyncEngineContext } from './engine';
import { deleteLocalEntity, parseCloudEntity, putLocalEntity, readLocalEntity } from './entities';

export type ConflictChoice = 'local' | 'remote';

export interface ConflictResolutionContext {
  db: GiftTrackerDatabase;
  nowIso: () => string;
}

export async function resolveConflict(
  ctx: ConflictResolutionContext | SyncEngineContext,
  entityType: SyncEntityType,
  entityId: string,
  choice: ConflictChoice,
): Promise<void> {
  const { db } = ctx;
  const key = syncKey(entityType, entityId);
  const conflict = await db.syncConflicts.get(key);

  if (!conflict) {
    throw new NotFoundError('Conflict', `${entityType}:${entityId}`);
  }

  const now = ctx.nowIso();

  if (choice === 'local') {
    const localData = conflict.localData ?? (await readLocalEntity(db, entityType, entityId));

    await db.transaction(
      'rw',
      [db.syncOutbox, db.syncTombstones, db.syncState, db.syncConflicts],
      async () => {
        await db.syncConflicts.delete(key);
        await db.syncState.put({
          entityType,
          entityId,
          serverRevision: conflict.remoteRevision,
          syncedAt: null,
          lastError: null,
        });

        if (localData) {
          await db.syncTombstones.delete(key);
          await db.syncOutbox.put({
            entityType,
            entityId,
            queuedAt: now,
            attempts: 0,
            lastError: null,
          });
        } else {
          await db.syncOutbox.delete(key);
          await db.syncTombstones.put({
            entityType,
            entityId,
            deletedAt: now,
            attempts: 0,
            lastError: null,
          });
        }
      },
    );
    return;
  }

  if (!conflict.remoteDeleted && !conflict.remoteData) {
    throw new SyncError('The cloud version of this record could not be read.', {
      recovery:
        'Keep this device’s version, or reconnect and try again before choosing the cloud copy.',
    });
  }

  const remoteData = conflict.remoteData ? parseCloudEntity(entityType, conflict.remoteData) : null;

  await db.transaction(
    'rw',
    [
      db.seasons,
      db.recipients,
      db.gifts,
      db.ideas,
      db.settings,
      db.syncOutbox,
      db.syncTombstones,
      db.syncState,
      db.syncConflicts,
    ],
    async () => {
      await db.syncConflicts.delete(key);
      await db.syncOutbox.delete(key);
      await db.syncTombstones.delete(key);

      if (conflict.remoteDeleted || !remoteData) {
        await deleteLocalEntity(db, entityType, entityId);
      } else {
        await putLocalEntity(db, entityType, remoteData);
      }

      await db.syncState.put({
        entityType,
        entityId,
        serverRevision: conflict.remoteRevision,
        syncedAt: now,
        lastError: null,
      });
    },
  );
}

export async function listConflicts(db: GiftTrackerDatabase) {
  return db.syncConflicts.orderBy('detectedAt').toArray();
}
