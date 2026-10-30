import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SeasonId } from '../domain/entities';
import { SyncError } from '../domain/errors';
import { setChangeTrackingEnabled } from '../storage/changeTracking';
import { linkDevice, readSyncLink } from '../storage/syncLink';
import { syncNow, getSyncStatus } from './engine';
import { resolveConflict } from './conflicts';
import { createTestStorage, type TestStorage } from '../test/storage';
import { FakeCloudServer } from '../test/fakeCloud';

const USER = '11111111-1111-4111-8111-aaaaaaaaaaaa';
const OTHER_USER = '11111111-1111-4111-8111-bbbbbbbbbbbb';

let storage: TestStorage;
let server: FakeCloudServer;
let clock: Date;

function advance(ms = 60_000) {
  clock = new Date(clock.getTime() + ms);
}

function context() {
  return {
    db: storage.db,
    adapter: server.adapterFor(USER),
    nowIso: () => clock.toISOString(),
  };
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

beforeEach(async () => {
  setChangeTrackingEnabled(true);
  clock = new Date('2026-11-01T10:00:00.000Z');
  storage = await createTestStorage({ now: () => clock });
  server = new FakeCloudServer();
  await linkDevice(storage.db, {
    userId: USER,
    email: 'alex@example.com',
    at: clock.toISOString(),
  });
});

afterEach(async () => {
  setChangeTrackingEnabled(false);
  await storage.cleanup();
});

describe('sync engine push', () => {
  it('uploads queued changes parents first and clears the outbox', async () => {
    const { season, recipient, gift } = await seed();

    const summary = await syncNow(context());

    expect(summary).toMatchObject({ pushed: 4, pulled: 4, conflicts: 0, pending: 0 });
    expect(await storage.db.syncOutbox.count()).toBe(0);

    const seasonRow = server.row(USER, 'season', season.id);
    const recipientRow = server.row(USER, 'recipient', recipient.id);
    const giftRow = server.row(USER, 'gift', gift.id);
    const settingsRow = server.row(USER, 'settings', 'app');

    expect(seasonRow).not.toBeNull();
    expect(recipientRow).not.toBeNull();
    expect(giftRow).not.toBeNull();
    expect(settingsRow?.data).toMatchObject({ activeSeasonId: season.id });
    expect(seasonRow!.seq).toBeLessThan(recipientRow!.seq);
    expect(recipientRow!.seq).toBeLessThan(giftRow!.seq);
    expect(giftRow!.seq).toBeLessThan(settingsRow!.seq);

    const state = await storage.db.syncState.get(['season', season.id]);
    expect(state?.serverRevision).toBe(1);
  });

  it('keeps the queue and local data when the network fails, then retries', async () => {
    const { season } = await seed();
    server.offline = true;

    await expect(syncNow(context())).rejects.toBeInstanceOf(SyncError);

    const entries = await storage.db.syncOutbox.toArray();
    expect(entries).toHaveLength(4);
    const seasonEntry = entries.find(
      (entry) => entry.entityType === 'season' && entry.entityId === season.id,
    );
    expect(seasonEntry?.attempts).toBe(1);
    expect(seasonEntry?.lastError).toBe('Network unavailable');
    expect((await readSyncLink(storage.db))?.lastError).toBe('Network unavailable');
    expect(await storage.db.seasons.get(season.id)).toBeDefined();

    server.offline = false;
    const summary = await syncNow(context());

    expect(summary.pushed).toBe(4);
    expect(await storage.db.syncOutbox.count()).toBe(0);
    expect((await readSyncLink(storage.db))?.lastError).toBeNull();
  });

  it('treats a lost acknowledgement as an idempotent replay', async () => {
    const { season } = await seed();
    await syncNow(context());

    const remote = server.row(USER, 'season', season.id);
    expect(remote?.revision).toBe(1);

    await storage.db.syncOutbox.put({
      entityType: 'season',
      entityId: season.id,
      queuedAt: clock.toISOString(),
      attempts: 0,
      lastError: null,
    });
    await storage.db.syncState.put({
      entityType: 'season',
      entityId: season.id,
      serverRevision: 0,
      syncedAt: null,
      lastError: null,
    });

    const summary = await syncNow(context());

    expect(summary.conflicts).toBe(0);
    expect(await storage.db.syncOutbox.count()).toBe(0);
    expect(server.row(USER, 'season', season.id)?.revision).toBe(1);
    expect((await storage.db.syncState.get(['season', season.id]))?.serverRevision).toBe(1);
  });
});

describe('sync engine pull', () => {
  it('applies cloud creates, updates, and deletions made on another device', async () => {
    const remoteSeason = {
      id: '11111111-1111-4111-8111-cccccccccccc',
      name: 'Remote season',
      holidayDate: '2026-12-25',
      budgetMinor: 40000,
      status: 'active',
      isSample: false,
      archivedAt: null,
      createdAt: clock.toISOString(),
      updatedAt: clock.toISOString(),
    };

    server.seedRow(USER, 'season', remoteSeason.id, remoteSeason, clock.toISOString());
    await syncNow(context());

    expect(await storage.db.seasons.get(remoteSeason.id as SeasonId)).toMatchObject({
      name: 'Remote season',
    });

    advance();
    const renamed = { ...remoteSeason, name: 'Renamed remotely', updatedAt: clock.toISOString() };
    server.seedRow(USER, 'season', remoteSeason.id, renamed, clock.toISOString());
    await syncNow(context());

    expect((await storage.db.seasons.get(remoteSeason.id as SeasonId))?.name).toBe(
      'Renamed remotely',
    );

    advance();
    await server.adapterFor(USER).delete({
      entityType: 'season',
      entityId: remoteSeason.id,
      baseRevision: 2,
      deletedAt: clock.toISOString(),
    });
    await syncNow(context());

    expect(await storage.db.seasons.get(remoteSeason.id as SeasonId)).toBeUndefined();
    expect((await storage.db.syncState.get(['season', remoteSeason.id]))?.serverRevision).toBe(3);
  });

  it('keeps a newer local edit when pulling its own uploaded row', async () => {
    const { season } = await seed();
    await syncNow(context());
    advance();

    await storage.repositories.seasons.update(season.id, { budgetMinor: 12345 });
    await syncNow(context());

    expect((await storage.db.seasons.get(season.id))?.budgetMinor).toBe(12345);
    expect(server.row(USER, 'season', season.id)?.data).toMatchObject({ budgetMinor: 12345 });
    expect(await storage.db.syncOutbox.count()).toBe(0);
  });
});

describe('sync conflicts', () => {
  it('surfaces a same-record difference instead of overwriting either side', async () => {
    const { season } = await seed();
    advance();
    server.seedRow(
      USER,
      'season',
      season.id,
      { ...season, name: 'Cloud name', updatedAt: clock.toISOString() },
      clock.toISOString(),
    );

    const summary = await syncNow(context());

    expect(summary.conflicts).toBe(1);
    expect((await storage.db.seasons.get(season.id))?.name).toBe('Christmas 2026');
    expect(server.row(USER, 'season', season.id)?.data).toMatchObject({ name: 'Cloud name' });

    const conflict = await storage.db.syncConflicts.get(['season', season.id]);
    expect(conflict).toMatchObject({ kind: 'update', remoteDeleted: false });
    expect(conflict?.localData).toMatchObject({ name: 'Christmas 2026' });
    expect(conflict?.remoteData).toMatchObject({ name: 'Cloud name' });
  });

  it('keeps this device’s version when the user chooses it', async () => {
    const { season } = await seed();
    advance();
    server.seedRow(
      USER,
      'season',
      season.id,
      { ...season, name: 'Cloud name', updatedAt: clock.toISOString() },
      clock.toISOString(),
    );
    await syncNow(context());

    await resolveConflict(context(), 'season', season.id, 'local');
    expect(await storage.db.syncConflicts.count()).toBe(0);
    expect((await storage.db.syncOutbox.get(['season', season.id]))?.attempts).toBe(0);

    advance();
    await syncNow(context());

    expect(server.row(USER, 'season', season.id)?.data).toMatchObject({ name: 'Christmas 2026' });
    expect(server.row(USER, 'season', season.id)?.revision).toBe(2);
  });

  it('uses the cloud version when the user chooses it', async () => {
    const { season } = await seed();
    advance();
    server.seedRow(
      USER,
      'season',
      season.id,
      { ...season, name: 'Cloud name', updatedAt: clock.toISOString() },
      clock.toISOString(),
    );
    await syncNow(context());

    await resolveConflict(context(), 'season', season.id, 'remote');

    expect(await storage.db.syncConflicts.count()).toBe(0);
    expect((await storage.db.seasons.get(season.id))?.name).toBe('Cloud name');
    expect((await storage.db.syncState.get(['season', season.id]))?.serverRevision).toBe(1);
  });

  it('turns a cloud deletion of a locally edited record into a decision', async () => {
    const { season } = await seed();
    await syncNow(context());
    advance();

    await server.adapterFor(USER).delete({
      entityType: 'season',
      entityId: season.id,
      baseRevision: 1,
      deletedAt: clock.toISOString(),
    });
    advance();
    await storage.repositories.seasons.update(season.id, { name: 'Edited locally' });

    await syncNow(context());

    const conflict = await storage.db.syncConflicts.get(['season', season.id]);
    expect(conflict).toMatchObject({ kind: 'update', remoteDeleted: true, remoteData: null });
    expect((await storage.db.seasons.get(season.id))?.name).toBe('Edited locally');

    await resolveConflict(context(), 'season', season.id, 'local');
    advance();
    await syncNow(context());

    expect(server.row(USER, 'season', season.id)?.deleted).toBe(false);
    expect(server.row(USER, 'season', season.id)?.data).toMatchObject({ name: 'Edited locally' });
  });

  it('reconciles a local deletion with a cloud deletion', async () => {
    const { season } = await seed();
    await syncNow(context());
    advance();

    await server.adapterFor(USER).delete({
      entityType: 'season',
      entityId: season.id,
      baseRevision: 1,
      deletedAt: clock.toISOString(),
    });
    advance();
    await storage.repositories.seasons.archive(season.id);
    await storage.repositories.seasons.delete(season.id, season.name);

    const summary = await syncNow(context());

    expect(summary.conflicts).toBe(0);
    expect(await storage.db.syncTombstones.count()).toBe(0);
    expect(server.row(USER, 'season', season.id)?.deleted).toBe(true);
  });
});

describe('sync status', () => {
  it('reports local, pending, synced, offline, and conflict states', async () => {
    expect((await getSyncStatus(storage.db, { online: true })).state).toBe('idle');

    await storage.db.syncMeta.clear();
    expect((await getSyncStatus(storage.db, { online: true })).state).toBe('local');

    await linkDevice(storage.db, {
      userId: USER,
      email: 'alex@example.com',
      at: clock.toISOString(),
    });
    await seed();
    expect(await getSyncStatus(storage.db, { online: true })).toMatchObject({
      state: 'pending',
      pendingCount: 4,
    });

    await syncNow(context());
    expect(await getSyncStatus(storage.db, { online: true })).toMatchObject({
      state: 'synced',
      pendingCount: 0,
      conflictCount: 0,
    });

    expect((await getSyncStatus(storage.db, { online: false })).state).toBe('offline');

    advance();
    const season = (await storage.db.seasons.toArray())[0];
    server.seedRow(
      USER,
      'season',
      season.id,
      { ...season, name: 'Cloud name', updatedAt: clock.toISOString() },
      clock.toISOString(),
    );
    advance();
    await storage.repositories.seasons.update(season.id, { name: 'Local name' });
    await syncNow(context());

    expect(await getSyncStatus(storage.db, { online: true })).toMatchObject({
      state: 'conflict',
      conflictCount: 1,
    });
  });
});

describe('account isolation', () => {
  it('never exposes one account’s rows to another adapter', async () => {
    const { season } = await seed();
    await syncNow(context());

    expect(await server.adapterFor(OTHER_USER).listChanges(0, 100)).toEqual([]);
    expect(server.row(OTHER_USER, 'season', season.id)).toBeNull();
    expect(await server.adapterFor(USER).listChanges(0, 100)).not.toHaveLength(0);
  });
});

describe('unreadable cloud data', () => {
  it('skips a malformed cloud row and records a link error', async () => {
    server.seedRow(
      USER,
      'season',
      '11111111-1111-4111-8111-dddddddddddd',
      { id: 'not-a-valid-season' },
      clock.toISOString(),
    );

    await syncNow(context());

    expect(await storage.db.seasons.count()).toBe(0);
    expect((await readSyncLink(storage.db))?.lastError).toBe(
      'Some cloud records could not be read and were skipped.',
    );
  });
});
