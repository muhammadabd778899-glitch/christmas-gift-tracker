import type { Timestamp } from '../domain/entities';
import { ConflictError } from '../domain/errors';
import { setChangeTrackingEnabled } from './changeTracking';
import type { GiftTrackerDatabase } from './db';
import type { SyncLink } from './syncTypes';

export interface LinkDeviceInput {
  userId: string;
  email: string | null;
  at: Timestamp;
}

export async function readSyncLink(db: GiftTrackerDatabase): Promise<SyncLink | null> {
  return (await db.syncMeta.get('link')) ?? null;
}

export async function linkDevice(
  db: GiftTrackerDatabase,
  input: LinkDeviceInput,
): Promise<SyncLink> {
  const link: SyncLink = {
    key: 'link',
    userId: input.userId,
    email: input.email,
    linkedAt: input.at,
    lastServerSeq: 0,
    lastSyncedAt: null,
    lastError: null,
  };

  await db.syncMeta.put(link);
  setChangeTrackingEnabled(true);
  return link;
}

export async function disconnectDevice(db: GiftTrackerDatabase): Promise<void> {
  await clearSyncState(db);
  setChangeTrackingEnabled(false);
}

export async function assertDeviceNotLinked(db: GiftTrackerDatabase): Promise<void> {
  const link = await db.syncMeta.get('link');

  if (link) {
    throw new ConflictError(
      'This device is linked to a sync account.',
      'Open Account and disconnect this device before restoring, resetting, or changing sample data. Disconnecting keeps your local plans.',
    );
  }
}

export async function clearSyncState(db: GiftTrackerDatabase): Promise<void> {
  await Promise.all([
    db.syncMeta.clear(),
    db.syncOutbox.clear(),
    db.syncTombstones.clear(),
    db.syncState.clear(),
    db.syncConflicts.clear(),
  ]);
}
