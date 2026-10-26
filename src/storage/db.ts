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

export const APP_DATABASE_NAME = 'christmas-gift-tracker';
export const SCHEMA_VERSION = 1;

export const V1_STORES = {
  meta: 'key',
  settings: 'id',
  seasons: 'id, status, holidayDate, isSample, updatedAt',
  recipients: 'id, seasonId, [seasonId+name], updatedAt',
  gifts: 'id, seasonId, recipientId, [seasonId+recipientId], &sourceIdeaId, updatedAt',
  ideas: 'id, seasonId, recipientId, status, convertedGiftId, updatedAt',
} as const;

export class GiftTrackerDatabase extends Dexie {
  meta!: Table<MetaRecord, MetaKey>;
  settings!: Table<AppSettings, 'app'>;
  seasons!: Table<Season, SeasonId>;
  recipients!: Table<Recipient, RecipientId>;
  gifts!: Table<Gift, GiftId>;
  ideas!: Table<Idea, IdeaId>;

  constructor(name = APP_DATABASE_NAME) {
    super(name);

    this.version(SCHEMA_VERSION).stores(V1_STORES);
  }
}

export function createDatabase(name = APP_DATABASE_NAME): GiftTrackerDatabase {
  return new GiftTrackerDatabase(name);
}

export const appDatabase = createDatabase();
