import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ValidationError } from '../domain/errors';
import { initializeStorage } from './initialize';
import { createTestStorage, type TestStorage } from '../test/storage';
import { FIXED_TIMESTAMP } from '../test/fixtures';
import { SCHEMA_VERSION } from './db';

let storage: TestStorage;

beforeEach(async () => {
  storage = await createTestStorage();
});

afterEach(async () => {
  await storage.cleanup();
});

async function seedData() {
  const season = await storage.repositories.seasons.create({
    name: 'Christmas 2026',
    holidayDate: '2026-12-25',
    budgetMinor: 50000,
  });
  const recipient = await storage.repositories.recipients.create({
    seasonId: season.id,
    name: 'Alex',
    budgetCapMinor: 15000,
  });
  await storage.repositories.gifts.create({
    seasonId: season.id,
    recipientId: recipient.id,
    name: 'Warm scarf',
  });
  await storage.repositories.ideas.create({
    seasonId: season.id,
    recipientId: recipient.id,
    name: 'Book of walks',
  });

  return { season, recipient };
}

describe('explicit reset', () => {
  it('refuses to clear data without the exact DELETE confirmation', async () => {
    await seedData();

    await expect(storage.repositories.data.resetAllData('delete')).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(storage.repositories.data.resetAllData('DELETE NOW')).rejects.toBeInstanceOf(
      ValidationError,
    );

    expect(await storage.db.seasons.count()).toBe(1);
    expect(await storage.db.recipients.count()).toBe(1);
    expect(await storage.db.gifts.count()).toBe(1);
    expect(await storage.db.ideas.count()).toBe(1);
  });

  it('clears every planning store, preserves databaseId, and recreates safe settings', async () => {
    await seedData();
    const databaseId = (await storage.db.meta.get('databaseId'))?.value;

    const result = await storage.repositories.data.resetAllData('DELETE');

    expect(result.settings.id).toBe('app');
    expect(result.settings.activeSeasonId).toBeNull();
    expect(result.settings.currencyCode).toBe('USD');
    expect(await storage.db.seasons.count()).toBe(0);
    expect(await storage.db.recipients.count()).toBe(0);
    expect(await storage.db.gifts.count()).toBe(0);
    expect(await storage.db.ideas.count()).toBe(0);
    expect((await storage.db.meta.get('databaseId'))?.value).toBe(databaseId);
    expect((await storage.db.meta.get('schemaVersion'))?.value).toBe(SCHEMA_VERSION);
    expect((await storage.db.meta.get('lastOpenedAt'))?.value).toBe(FIXED_TIMESTAMP);
  });

  it('is never called by startup and leaves records intact across reopen', async () => {
    const { season } = await seedData();

    await initializeStorage({
      db: storage.db,
      appVersion: '0.2.1-test',
      now: () => new Date('2026-11-01T00:00:00.000Z'),
    });

    expect(await storage.db.seasons.get(season.id)).toBeDefined();
    expect(await storage.db.recipients.count()).toBe(1);
    expect(await storage.db.gifts.count()).toBe(1);
    expect(await storage.db.ideas.count()).toBe(1);
  });
});
