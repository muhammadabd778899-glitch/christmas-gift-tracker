import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { MigrationError } from '../domain/errors';
import { createDatabase, SCHEMA_VERSION, type GiftTrackerDatabase } from './db';
import { initializeStorage } from './initialize';
import { createTestStorage, type TestStorage } from '../test/storage';
import { FIXED_IDS, FIXED_TIMESTAMP, makeSettings } from '../test/fixtures';

const stores: TestStorage[] = [];

async function testStorage(): Promise<TestStorage> {
  const storage = await createTestStorage();
  stores.push(storage);
  return storage;
}

afterEach(async () => {
  await Promise.all(stores.splice(0).map((storage) => storage.cleanup()));
});

describe('database initialization', () => {
  it('opens the version-1 stores and indexes from the data model', async () => {
    const { db } = await testStorage();

    expect(db.verno).toBe(SCHEMA_VERSION);
    expect(db.tables.map((table) => table.name).sort()).toEqual(
      ['gifts', 'ideas', 'meta', 'recipients', 'seasons', 'settings'].sort(),
    );

    expect(db.seasons.schema.indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining(['status', 'holidayDate', 'isSample', 'updatedAt']),
    );
    expect(db.recipients.schema.indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining(['seasonId', '[seasonId+name]', 'updatedAt']),
    );
    expect(db.gifts.schema.indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining([
        'seasonId',
        'recipientId',
        '[seasonId+recipientId]',
        'sourceIdeaId',
        'updatedAt',
      ]),
    );
    expect(db.ideas.schema.indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining(['seasonId', 'recipientId', 'status', 'convertedGiftId', 'updatedAt']),
    );

    const sourceIdeaIndex = db.gifts.schema.indexes.find((index) => index.name === 'sourceIdeaId');
    expect(sourceIdeaIndex?.unique).toBe(true);
  });

  it('creates settings and diagnostics without creating a season', async () => {
    const storage = await testStorage();
    const { db, repositories } = storage;

    const settings = await repositories.settings.get();
    expect(settings.id).toBe('app');
    expect(settings.activeSeasonId).toBeNull();
    expect(settings.currencyCode).toBe('USD');
    expect(settings.currencySymbol).toBe('$');
    expect(settings.fractionDigits).toBe(2);
    expect(settings.theme).toBe('system');
    expect(settings.hasCompletedOnboarding).toBe(false);
    expect(await db.seasons.count()).toBe(0);

    const meta = new Map((await db.meta.toArray()).map((record) => [record.key, record.value]));
    expect(meta.get('schemaVersion')).toBe(SCHEMA_VERSION);
    expect(meta.get('databaseId')).toEqual(expect.any(String));
    expect(meta.get('appVersion')).toBe('0.2.0-test');
    expect(meta.get('lastOpenedAt')).toBe(FIXED_TIMESTAMP);
  });

  it('updates diagnostics on reopen without overwriting existing settings', async () => {
    const storage = await testStorage();
    const originalSettings = await storage.repositories.settings.get();
    const originalDatabaseId = (await storage.db.meta.get('databaseId'))?.value;

    const reopened = await initializeStorage({
      db: storage.db,
      appVersion: '0.3.0-test',
      locale: 'fr-FR',
      now: () => new Date('2026-11-01T08:30:00.000Z'),
    });

    expect(reopened.settings).toEqual(originalSettings);
    expect(await storage.db.settings.count()).toBe(1);
    expect(await storage.db.settings.get('app')).toEqual(originalSettings);
    expect((await storage.db.meta.get('databaseId'))?.value).toBe(originalDatabaseId);
    expect((await storage.db.meta.get('appVersion'))?.value).toBe('0.3.0-test');
    expect((await storage.db.meta.get('lastOpenedAt'))?.value).toBe('2026-11-01T08:30:00.000Z');
  });

  it('does not overwrite settings seeded before startup', async () => {
    const name = `christmas-gift-tracker-test-${crypto.randomUUID()}`;
    const seedDb = createDatabase(name);

    try {
      await seedDb.open();
      const seeded = makeSettings({
        activeSeasonId: FIXED_IDS.season as ReturnType<typeof makeSettings>['activeSeasonId'],
        currencyCode: 'GBP',
        currencySymbol: '£',
        fractionDigits: 2,
        locale: 'en-GB',
        hasCompletedOnboarding: true,
      });
      await seedDb.settings.add(seeded);
      await seedDb.close();

      const opened = await initializeStorage({
        db: createDatabase(name),
        appVersion: '0.2.0-test',
        locale: 'en-US',
        now: () => new Date('2026-10-27T09:00:00.000Z'),
      });

      expect(opened.settings).toEqual(seeded);
      expect(await opened.db.settings.count()).toBe(1);
      opened.db.close();
    } finally {
      seedDb.close();
      await Dexie.delete(name);
    }
  });

  it('preserves a valid settings record even when only diagnostics change', async () => {
    const storage = await testStorage();
    const settings = await storage.repositories.settings.get();

    await initializeStorage({
      db: storage.db,
      appVersion: '0.2.1-test',
      now: () => new Date('2026-12-01T00:00:00.000Z'),
    });

    expect(await storage.db.settings.get('app')).toEqual(settings);
  });

  it('does not replace an invalid database identity during startup', async () => {
    const storage = await testStorage();
    const settings = await storage.repositories.settings.get();

    await storage.db.meta.put({
      key: 'databaseId',
      value: 'not-a-valid-uuid',
      updatedAt: FIXED_TIMESTAMP,
    });

    await expect(
      initializeStorage({
        db: storage.db,
        appVersion: '0.2.0-test',
        now: () => new Date('2026-12-02T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(MigrationError);

    expect((await storage.db.meta.get('databaseId'))?.value).toBe('not-a-valid-uuid');
    expect(await storage.db.settings.get('app')).toEqual(settings);
  });
});

describe('database version details', () => {
  it('keeps the database name explicit for browser isolation', () => {
    const db: GiftTrackerDatabase = createDatabase('named-test-db');
    expect(db.name).toBe('named-test-db');
    db.close();
  });
});
