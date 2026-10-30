import Dexie, { type Table } from 'dexie';
import type {
  AppSettings,
  Gift,
  GiftId,
  Idea,
  IdeaId,
  MetaKey,
  MetaRecord,
  Recipient,
  RecipientId,
  Season,
  SeasonId,
} from '../domain/entities';
import type {
  SyncConflict,
  SyncEntityType,
  SyncLink,
  SyncOutboxEntry,
  SyncRecordState,
  SyncTombstone,
} from './syncTypes';

export const APP_DATABASE_NAME = 'christmas-gift-tracker';
export const SCHEMA_VERSION = 2;

export const V1_STORES = {
  meta: 'key',
  settings: 'id',
  seasons: 'id, status, holidayDate, isSample, updatedAt',
  recipients: 'id, seasonId, [seasonId+name], updatedAt',
  gifts: 'id, seasonId, recipientId, [seasonId+recipientId], &sourceIdeaId, updatedAt',
  ideas: 'id, seasonId, recipientId, status, convertedGiftId, updatedAt',
} as const;

export const V2_SYNC_STORES = {
  syncOutbox: '[entityType+entityId], queuedAt',
  syncTombstones: '[entityType+entityId], deletedAt',
  syncState: '[entityType+entityId], serverRevision',
  syncConflicts: '[entityType+entityId], detectedAt',
  syncMeta: 'key',
} as const;

export class GiftTrackerDatabase extends Dexie {
  meta!: Table<MetaRecord, MetaKey>;
  settings!: Table<AppSettings, 'app'>;
  seasons!: Table<Season, SeasonId>;
  recipients!: Table<Recipient, RecipientId>;
  gifts!: Table<Gift, GiftId>;
  ideas!: Table<Idea, IdeaId>;
  syncOutbox!: Table<SyncOutboxEntry, [SyncEntityType, string]>;
  syncTombstones!: Table<SyncTombstone, [SyncEntityType, string]>;
  syncState!: Table<SyncRecordState, [SyncEntityType, string]>;
  syncConflicts!: Table<SyncConflict, [SyncEntityType, string]>;
  syncMeta!: Table<SyncLink, 'link'>;

  constructor(name = APP_DATABASE_NAME) {
    super(name);

    this.version(1).stores(V1_STORES);
    this.version(2).stores(V2_SYNC_STORES);
  }
}

export function createDatabase(name = APP_DATABASE_NAME): GiftTrackerDatabase {
  return new GiftTrackerDatabase(name);
}

export const appDatabase = createDatabase();
