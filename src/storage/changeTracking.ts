import type { Timestamp } from '../domain/entities';
import type { GiftTrackerDatabase } from './db';
import type { SyncEntityType } from './syncTypes';

let trackingEnabled = false;
let suppressionDepth = 0;
const listeners = new Set<() => void>();

export function setChangeTrackingEnabled(value: boolean): void {
  trackingEnabled = value;
}

export function isChangeTrackingEnabled(): boolean {
  return trackingEnabled;
}

export async function withoutChangeTracking<T>(work: () => Promise<T>): Promise<T> {
  suppressionDepth += 1;
  try {
    return await work();
  } finally {
    suppressionDepth -= 1;
  }
}

export function subscribeToLocalChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyLocalChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export interface LocalChange {
  entityType: SyncEntityType;
  entityId: string;
  operation: 'upsert' | 'delete';
  at: Timestamp;
}

/**
 * Must be called inside a read-write Dexie transaction that includes the
 * syncOutbox and syncTombstones tables, so a change and its queued sync entry
 * commit or abort together.
 */
export async function recordLocalChange(
  db: GiftTrackerDatabase,
  change: LocalChange,
): Promise<void> {
  if (!trackingEnabled || suppressionDepth > 0) {
    return;
  }

  const key: [SyncEntityType, string] = [change.entityType, change.entityId];

  if (change.operation === 'delete') {
    await db.syncOutbox.delete(key);
    await db.syncTombstones.put({
      entityType: change.entityType,
      entityId: change.entityId,
      deletedAt: change.at,
      attempts: 0,
      lastError: null,
    });
  } else {
    await db.syncTombstones.delete(key);
    await db.syncOutbox.put({
      entityType: change.entityType,
      entityId: change.entityId,
      queuedAt: change.at,
      attempts: 0,
      lastError: null,
    });
  }

  notifyLocalChange();
}

export async function recordLocalChanges(
  db: GiftTrackerDatabase,
  changes: readonly LocalChange[],
): Promise<void> {
  for (const change of changes) {
    await recordLocalChange(db, change);
  }
}
