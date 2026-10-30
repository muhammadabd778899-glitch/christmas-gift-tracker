import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestStorage, type TestStorage } from '../test/storage';

let storage: TestStorage;

beforeEach(async () => {
  storage = await createTestStorage();
});

afterEach(async () => {
  await storage.cleanup();
});

describe('sample data', () => {
  it('creates one flagged, active sample season with recipients, gifts, and ideas', async () => {
    const result = await storage.repositories.data.loadSampleData();

    expect(result.created).toBe(true);
    expect(result.active).toBe(true);
    expect(result.season.isSample).toBe(true);
    expect(result.season.status).toBe('active');
    expect((await storage.repositories.settings.get()).activeSeasonId).toBe(result.season.id);
    expect(await storage.db.seasons.count()).toBe(1);
    expect(await storage.db.recipients.count()).toBe(2);
    expect(await storage.db.gifts.count()).toBe(3);
    expect(await storage.db.ideas.count()).toBe(2);

    const active = await storage.repositories.seasons.getActive();
    expect(active?.id).toBe(result.season.id);
  });

  it('is idempotent: loading twice never duplicates the sample', async () => {
    const first = await storage.repositories.data.loadSampleData();
    const counts = {
      seasons: await storage.db.seasons.count(),
      recipients: await storage.db.recipients.count(),
      gifts: await storage.db.gifts.count(),
      ideas: await storage.db.ideas.count(),
    };

    const second = await storage.repositories.data.loadSampleData();

    expect(second.created).toBe(false);
    expect(second.season.id).toBe(first.season.id);
    expect(second.active).toBe(true);
    expect(await storage.db.seasons.count()).toBe(counts.seasons);
    expect(await storage.db.recipients.count()).toBe(counts.recipients);
    expect(await storage.db.gifts.count()).toBe(counts.gifts);
    expect(await storage.db.ideas.count()).toBe(counts.ideas);
  });

  it('adds the sample as archived when a real season is active and leaves totals alone', async () => {
    const real = await storage.repositories.seasons.create({
      name: 'Real Christmas',
      holidayDate: '2026-12-25',
      budgetMinor: 20000,
    });
    const recipient = await storage.repositories.recipients.create({
      seasonId: real.id,
      name: 'Real person',
    });
    await storage.repositories.gifts.create({
      seasonId: real.id,
      recipientId: recipient.id,
      name: 'Real gift',
      plannedBudgetMinor: 5000,
    });

    const result = await storage.repositories.data.loadSampleData();

    expect(result.created).toBe(true);
    expect(result.active).toBe(false);
    expect(result.season.status).toBe('archived');
    expect(result.season.archivedAt).not.toBeNull();
    expect((await storage.repositories.settings.get()).activeSeasonId).toBe(real.id);
    expect(await storage.repositories.gifts.listBySeason(real.id)).toHaveLength(1);
    expect(await storage.repositories.gifts.listBySeason(result.season.id)).toHaveLength(3);
  });

  it('adds the sample as archived when only archived real seasons exist', async () => {
    const real = await storage.repositories.seasons.create({
      name: 'Past Christmas',
      holidayDate: '2024-12-25',
    });
    await storage.repositories.seasons.archive(real.id);

    const result = await storage.repositories.data.loadSampleData();

    expect(result.active).toBe(false);
    expect(result.season.status).toBe('archived');
    expect((await storage.repositories.settings.get()).activeSeasonId).toBeNull();
    expect(await storage.repositories.seasons.getActive()).toBeNull();
  });

  it('removes only the sample season and its children', async () => {
    const real = await storage.repositories.seasons.create({
      name: 'Real Christmas',
      holidayDate: '2026-12-25',
    });
    const recipient = await storage.repositories.recipients.create({
      seasonId: real.id,
      name: 'Real person',
    });
    await storage.repositories.gifts.create({
      seasonId: real.id,
      recipientId: recipient.id,
      name: 'Real gift',
    });
    const sample = await storage.repositories.data.loadSampleData();

    const result = await storage.repositories.data.removeSampleData();

    expect(result).toMatchObject({
      removedSeasons: 1,
      removedRecipients: 2,
      removedGifts: 3,
      removedIdeas: 2,
    });
    await expect(storage.repositories.seasons.get(sample.season.id)).rejects.toThrow();
    expect(await storage.repositories.seasons.get(real.id)).toBeDefined();
    expect(await storage.repositories.gifts.listBySeason(real.id)).toHaveLength(1);
    expect((await storage.repositories.settings.get()).activeSeasonId).toBe(real.id);
  });

  it('clears the active selection when the active sample season is removed', async () => {
    const sample = await storage.repositories.data.loadSampleData();

    await storage.repositories.data.removeSampleData();

    expect(await storage.repositories.seasons.getActive()).toBeNull();
    expect((await storage.repositories.settings.get()).activeSeasonId).toBeNull();
    expect(await storage.db.seasons.count()).toBe(0);
    expect(sample.season.isSample).toBe(true);
  });

  it('is a no-op when no sample exists', async () => {
    expect(await storage.repositories.data.removeSampleData()).toEqual({
      removedSeasons: 0,
      removedRecipients: 0,
      removedGifts: 0,
      removedIdeas: 0,
    });
  });
});
