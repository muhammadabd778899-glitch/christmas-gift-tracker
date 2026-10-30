import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDatabase, SCHEMA_VERSION, V1_STORES } from './db';
import {
  isChangeTrackingEnabled,
  recordLocalChange,
  setChangeTrackingEnabled,
  subscribeToLocalChanges,
  withoutChangeTracking,
} from './changeTracking';
import { createTestStorage, type TestStorage } from '../test/storage';
import type { Season } from '../domain/entities';

let storage: TestStorage;

beforeEach(async () => {
  storage = await createTestStorage();
  setChangeTrackingEnabled(true);
});

afterEach(async () => {
  setChangeTrackingEnabled(false);
  await storage.cleanup();
});

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
  const idea = await storage.repositories.ideas.create({
    seasonId: season.id,
    recipientId: recipient.id,
    name: 'Book of walks',
  });

  return { season, recipient, gift, idea };
}

describe('transactional change tracking', () => {
  it('records nothing while disabled', async () => {
    setChangeTrackingEnabled(false);
    await seed();

    expect(await storage.db.syncOutbox.count()).toBe(0);
    expect(await storage.db.syncTombstones.count()).toBe(0);
  });

  it('records creates and coalesces repeated edits into one pending upsert', async () => {
    const { season, recipient } = await seed();

    await storage.repositories.seasons.update(season.id, { name: 'Christmas 2026 (updated)' });
    await storage.repositories.seasons.update(season.id, { budgetMinor: 60000 });

    const outbox = await storage.db.syncOutbox.toArray();
    const seasonEntries = outbox.filter(
      (entry) => entry.entityType === 'season' && entry.entityId === season.id,
    );

    expect(seasonEntries).toHaveLength(1);
    expect(outbox.some((entry) => entry.entityType === 'recipient')).toBe(true);
    expect(outbox.some((entry) => entry.entityType === 'settings')).toBe(true);
    expect(recipient.name).toBe('Alex');
  });

  it('records a tombstone and removes a pending upsert on delete', async () => {
    const { gift } = await seed();

    await storage.repositories.gifts.delete(gift.id);

    expect(await storage.db.syncOutbox.get(['gift', gift.id])).toBeUndefined();
    expect(await storage.db.syncTombstones.get(['gift', gift.id])).toMatchObject({
      entityType: 'gift',
      entityId: gift.id,
    });
  });

  it('records parent and child changes in one season operation', async () => {
    const { season } = await seed();

    await storage.repositories.seasons.create(
      { name: 'Christmas 2027', holidayDate: '2027-12-25' },
      { archiveCurrent: true },
    );

    const outbox = await storage.db.syncOutbox.toArray();
    const seasonIds = outbox
      .filter((entry) => entry.entityType === 'season')
      .map((entry) => entry.entityId);

    expect(seasonIds).toContain(season.id);
    expect(outbox.some((entry) => entry.entityType === 'settings')).toBe(true);
  });

  it('records a deletion tombstone for every cascaded record', async () => {
    const { season, recipient, gift, idea } = await seed();

    await storage.repositories.seasons.update(season.id, { name: 'Archived soon' });
    await storage.repositories.seasons.archive(season.id);
    await storage.repositories.seasons.delete(season.id, 'Archived soon');

    expect(await storage.db.syncTombstones.get(['gift', gift.id])).toBeDefined();
    expect(await storage.db.syncTombstones.get(['idea', idea.id])).toBeDefined();
    expect(await storage.db.syncTombstones.get(['recipient', recipient.id])).toBeDefined();
    expect(await storage.db.syncTombstones.get(['season', season.id])).toBeDefined();
    expect(await storage.db.seasons.count()).toBe(0);
  });

  it('suppresses capture while applying remote data', async () => {
    const { season } = await seed();
    await storage.db.syncOutbox.clear();

    await withoutChangeTracking(async () => {
      await storage.repositories.seasons.update(season.id, { name: 'Remote name' });
    });

    expect(await storage.db.syncOutbox.get(['season', season.id])).toBeUndefined();
  });

  it('exposes tracking state and notifies subscribers', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToLocalChanges(listener);

    expect(isChangeTrackingEnabled()).toBe(true);
    await seed();
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    const calls = listener.mock.calls.length;
    await recordLocalChange(storage.db, {
      entityType: 'settings',
      entityId: 'app',
      operation: 'upsert',
      at: '2026-11-01T00:00:00.000Z',
    });
    expect(listener).toHaveBeenCalledTimes(calls);
  });

  it('rolls back the queued change when its transaction aborts', async () => {
    const { season } = await seed();
    await storage.db.syncOutbox.clear();
    const original = await storage.db.seasons.get(season.id);

    await expect(
      storage.db.transaction(
        'rw',
        [storage.db.seasons, storage.db.syncOutbox, storage.db.syncTombstones],
        async () => {
          await storage.db.seasons.put({ ...original!, name: 'Will be rolled back' });
          await recordLocalChange(storage.db, {
            entityType: 'season',
            entityId: season.id,
            operation: 'upsert',
            at: '2026-11-01T00:00:00.000Z',
          });
          throw new Error('simulated failure');
        },
      ),
    ).rejects.toThrow('simulated failure');

    expect(await storage.db.syncOutbox.count()).toBe(0);
    expect((await storage.db.seasons.get(season.id))?.name).toBe(original?.name);
  });
});

describe('schema 2 upgrade', () => {
  it('keeps version-1 records and adds sync tables without changing data', async () => {
    const name = `christmas-gift-tracker-upgrade-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores(V1_STORES);
    await legacy.open();

    const season: Season = {
      id: '11111111-1111-4111-8111-111111111111' as Season['id'],
      name: 'Legacy season',
      holidayDate: '2026-12-25',
      budgetMinor: 10000,
      status: 'active',
      isSample: false,
      archivedAt: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    };
    await legacy.table('seasons').add(season);
    legacy.close();

    const upgraded = createDatabase(name);
    try {
      await upgraded.open();
      expect(upgraded.verno).toBe(SCHEMA_VERSION);
      expect(await upgraded.seasons.get(season.id)).toEqual(season);
      expect(await upgraded.syncOutbox.count()).toBe(0);
      expect(await upgraded.syncMeta.count()).toBe(0);
    } finally {
      upgraded.close();
      await Dexie.delete(name);
    }
  });
});
