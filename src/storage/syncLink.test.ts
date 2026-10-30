import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConflictError } from '../domain/errors';
import { createBackup, restoreBackup } from './backup';
import { createRepositoryContext } from './repositories/context';
import { resetAllData } from './reset';
import { loadSampleData, removeSampleData } from './sample';
import { disconnectDevice, linkDevice, readSyncLink } from './syncLink';
import { createTestStorage, type TestStorage } from '../test/storage';

let storage: TestStorage;

beforeEach(async () => {
  storage = await createTestStorage();
});

afterEach(async () => {
  await storage.cleanup();
});

function context() {
  return createRepositoryContext(storage.db, { now: storage.now, appVersion: '0.11.0-test' });
}

async function seed() {
  const season = await storage.repositories.seasons.create({
    name: 'Christmas 2026',
    holidayDate: '2026-12-25',
    budgetMinor: 50000,
  });
  const recipient = await storage.repositories.recipients.create({
    seasonId: season.id,
    name: 'Alex',
  });
  const gift = await storage.repositories.gifts.create({
    seasonId: season.id,
    recipientId: recipient.id,
    name: 'Warm scarf',
  });

  return { season, recipient, gift };
}

async function link() {
  return linkDevice(storage.db, {
    userId: 'user-1',
    email: 'alex@example.com',
    at: '2026-11-01T00:00:00.000Z',
  });
}

async function snapshot() {
  return {
    seasons: await storage.db.seasons.toArray(),
    recipients: await storage.db.recipients.toArray(),
    gifts: await storage.db.gifts.toArray(),
    ideas: await storage.db.ideas.toArray(),
    settings: await storage.db.settings.toArray(),
  };
}

describe('device linkage', () => {
  it('records the account link and cannot link twice through the same key', async () => {
    await link();

    const stored = await readSyncLink(storage.db);

    expect(stored).toMatchObject({
      key: 'link',
      userId: 'user-1',
      email: 'alex@example.com',
      linkedAt: '2026-11-01T00:00:00.000Z',
      lastServerSeq: 0,
      lastSyncedAt: null,
    });
  });

  it('blocks restore, reset, and sample tools while linked without changing data', async () => {
    await seed();
    const backup = await createBackup(context());
    await link();
    const before = await snapshot();

    await expect(
      restoreBackup(
        context(),
        { size: backup.content.length, text: async () => backup.content },
        { confirmation: 'RESTORE' },
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    await expect(resetAllData(context(), { confirmation: 'DELETE' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(loadSampleData(context())).rejects.toBeInstanceOf(ConflictError);
    await expect(removeSampleData(context())).rejects.toBeInstanceOf(ConflictError);

    expect(await snapshot()).toEqual(before);
  });

  it('disconnect clears sync state but keeps local plans', async () => {
    const { season, recipient, gift } = await seed();
    await link();
    await storage.db.syncOutbox.put({
      entityType: 'gift',
      entityId: gift.id,
      queuedAt: '2026-11-01T00:00:00.000Z',
      attempts: 1,
      lastError: null,
    });
    await storage.db.syncTombstones.put({
      entityType: 'idea',
      entityId: 'idea-1',
      deletedAt: '2026-11-01T00:00:00.000Z',
      attempts: 0,
      lastError: null,
    });
    await storage.db.syncState.put({
      entityType: 'season',
      entityId: season.id,
      serverRevision: 3,
      syncedAt: '2026-11-01T00:00:00.000Z',
      lastError: null,
    });
    await storage.db.syncConflicts.put({
      entityType: 'recipient',
      entityId: recipient.id,
      kind: 'update',
      localData: null,
      remoteData: null,
      remoteDeleted: false,
      remoteRevision: 2,
      detectedAt: '2026-11-01T00:00:00.000Z',
    });
    const before = await snapshot();

    await disconnectDevice(storage.db);

    expect(await readSyncLink(storage.db)).toBeNull();
    expect(await storage.db.syncOutbox.count()).toBe(0);
    expect(await storage.db.syncTombstones.count()).toBe(0);
    expect(await storage.db.syncState.count()).toBe(0);
    expect(await storage.db.syncConflicts.count()).toBe(0);
    expect(await snapshot()).toEqual(before);

    await expect(resetAllData(context(), { confirmation: 'DELETE' })).resolves.toBeDefined();
    expect(await storage.db.seasons.count()).toBe(0);
  });
});
