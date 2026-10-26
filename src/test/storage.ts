import Dexie from 'dexie';
import { initializeStorage } from '../storage/initialize';
import { createDatabase, type GiftTrackerDatabase } from '../storage/db';
import { createRepositories, type Repositories } from '../storage/repositories';
import { fixedNow } from './fixtures';

export interface TestStorage {
  db: GiftTrackerDatabase;
  repositories: Repositories;
  name: string;
  now: () => Date;
  cleanup: () => Promise<void>;
}

interface CreateTestStorageOptions {
  now?: () => Date;
  locale?: string;
  appVersion?: string;
}

export async function createTestStorage(
  options: CreateTestStorageOptions = {},
): Promise<TestStorage> {
  const name = `christmas-gift-tracker-test-${crypto.randomUUID()}`;
  const db = createDatabase(name);
  const now = options.now ?? fixedNow;
  const locale = options.locale ?? 'en-US';
  const appVersion = options.appVersion ?? '0.2.0-test';

  try {
    await initializeStorage({ db, appVersion, locale, now });
  } catch (error) {
    db.close();
    await Dexie.delete(name);
    throw error;
  }

  const repositories = createRepositories(db, { now, locale, appVersion });

  return {
    db,
    repositories,
    name,
    now,
    cleanup: async () => {
      db.close();
      await Dexie.delete(name);
    },
  };
}
