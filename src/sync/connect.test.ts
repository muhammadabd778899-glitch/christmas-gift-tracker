import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SeasonId } from '../domain/entities';
import { ConflictError, ValidationError } from '../domain/errors';
import { setChangeTrackingEnabled } from '../storage/changeTracking';
import { linkDevice, readSyncLink } from '../storage/syncLink';
import { connectAccount, CONNECT_CONFIRMATION, planConnection } from './connect';
import { createTestStorage, type TestStorage } from '../test/storage';
import { FakeCloudServer } from '../test/fakeCloud';
import { makeGift, makeRecipient, makeSeason, makeSettings } from '../test/fixtures';

const USER = '11111111-1111-4111-8111-aaaaaaaaaaaa';
const OTHER_USER = '11111111-1111-4111-8111-bbbbbbbbbbbb';

let storage: TestStorage;
let server: FakeCloudServer;
let clock: Date;

function context() {
  return {
    db: storage.db,
    adapter: server.adapterFor(USER),
    nowIso: () => clock.toISOString(),
  };
}

async function seedLocal() {
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
  clock = new Date('2026-11-01T10:00:00.000Z');
  storage = await createTestStorage({ now: () => clock });
  setChangeTrackingEnabled(true);
  server = new FakeCloudServer();
});

afterEach(async () => {
  setChangeTrackingEnabled(false);
  await storage.cleanup();
});

describe('connection planning', () => {
  it('plans an upload for an empty cloud', async () => {
    const { season } = await seedLocal();

    const plan = await planConnection(storage.db, server.adapterFor(USER));

    expect(plan).toMatchObject({
      mode: 'upload',
      localRecords: 4,
      cloudRecords: 0,
      localOnly: 4,
      cloudOnly: 0,
      conflicts: 0,
    });
    expect(season.id).toBeDefined();
  });

  it('plans a download for an empty device', async () => {
    server.seedRow(
      USER,
      'season',
      '11111111-1111-4111-8111-eeeeeeeeeeee',
      makeSeason({ id: '11111111-1111-4111-8111-eeeeeeeeeeee' as SeasonId }),
      clock.toISOString(),
    );

    const plan = await planConnection(storage.db, server.adapterFor(USER));

    expect(plan.mode).toBe('download');
    expect(plan.cloudOnly).toBe(1);
    expect(plan.localOnly).toBe(1);
  });

  it('plans a merge when both sides have plans', async () => {
    const { season, recipient } = await seedLocal();

    server.seedRow(
      USER,
      'season',
      season.id,
      { ...season, name: 'Cloud season', updatedAt: clock.toISOString() },
      clock.toISOString(),
    );
    server.seedRow(USER, 'recipient', recipient.id, recipient, clock.toISOString());
    const cloudRecipient = makeRecipient({
      id: '22222222-2222-4222-8222-ffffffffffff' as never,
      seasonId: season.id,
      name: 'Cloud cousin',
    });
    server.seedRow(USER, 'recipient', cloudRecipient.id, cloudRecipient, clock.toISOString());

    const plan = await planConnection(storage.db, server.adapterFor(USER));

    expect(plan).toMatchObject({
      mode: 'merge',
      identical: 1,
      localOnly: 2,
      cloudOnly: 1,
      conflicts: 1,
    });
  });
});

describe('connectAccount', () => {
  it('requires the typed confirmation and never links on failure', async () => {
    await seedLocal();

    await expect(
      connectAccount(context(), {
        userId: USER,
        email: 'alex@example.com',
        confirmation: 'connect',
        backupTaken: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(await readSyncLink(storage.db)).toBeNull();
    expect(await storage.db.syncOutbox.count()).toBeGreaterThan(0);
  });

  it('uploads an empty cloud after confirmation', async () => {
    const { season } = await seedLocal();

    const result = await connectAccount(context(), {
      userId: USER,
      email: 'alex@example.com',
      confirmation: CONNECT_CONFIRMATION,
      backupTaken: false,
    });

    expect(result.plan.mode).toBe('upload');
    expect(result.summary.pushed).toBe(4);
    expect(server.row(USER, 'season', season.id)).not.toBeNull();
    expect(server.row(USER, 'settings', 'app')?.data).toMatchObject({
      activeSeasonId: season.id,
    });
    expect(await storage.db.syncOutbox.count()).toBe(0);
    expect((await readSyncLink(storage.db))?.email).toBe('alex@example.com');
  });

  it('downloads an account into an empty device', async () => {
    const remoteSeason = makeSeason({
      id: '11111111-1111-4111-8111-eeeeeeeeeeee' as SeasonId,
      name: 'Remote Christmas',
    });
    const remoteRecipient = makeRecipient({
      id: '22222222-2222-4222-8222-eeeeeeeeeeee' as never,
      seasonId: remoteSeason.id,
      name: 'Remote cousin',
    });
    const remoteGift = makeGift({
      id: '33333333-3333-4333-8333-eeeeeeeeeeee' as never,
      seasonId: remoteSeason.id,
      recipientId: remoteRecipient.id,
      name: 'Remote scarf',
    });
    const remoteSettings = makeSettings({ activeSeasonId: remoteSeason.id });

    server.seedRow(USER, 'season', remoteSeason.id, remoteSeason, clock.toISOString());
    server.seedRow(USER, 'recipient', remoteRecipient.id, remoteRecipient, clock.toISOString());
    server.seedRow(USER, 'gift', remoteGift.id, remoteGift, clock.toISOString());
    server.seedRow(USER, 'settings', 'app', remoteSettings, clock.toISOString());

    const result = await connectAccount(context(), {
      userId: USER,
      email: 'alex@example.com',
      confirmation: CONNECT_CONFIRMATION,
      backupTaken: false,
    });

    expect(result.plan.mode).toBe('download');
    expect(await storage.db.seasons.get(remoteSeason.id)).toMatchObject({
      name: 'Remote Christmas',
    });
    expect(await storage.db.recipients.get(remoteRecipient.id)).toBeDefined();
    expect(await storage.db.gifts.get(remoteGift.id)).toBeDefined();
    expect((await storage.db.settings.get('app'))?.activeSeasonId).toBe(remoteSeason.id);
  });

  it('refuses to merge without a fresh backup and changes nothing', async () => {
    const { season } = await seedLocal();
    server.seedRow(
      USER,
      'season',
      season.id,
      { ...season, name: 'Cloud season', updatedAt: clock.toISOString() },
      clock.toISOString(),
    );
    const before = await storage.db.seasons.toArray();

    await expect(
      connectAccount(context(), {
        userId: USER,
        email: 'alex@example.com',
        confirmation: CONNECT_CONFIRMATION,
        backupTaken: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(await readSyncLink(storage.db)).toBeNull();
    expect(await storage.db.syncConflicts.count()).toBe(0);
    expect(await storage.db.seasons.toArray()).toEqual(before);
  });

  it('unions both sides without deleting or overwriting anything', async () => {
    const { season, recipient } = await seedLocal();

    server.seedRow(
      USER,
      'season',
      season.id,
      { ...season, name: 'Cloud season', updatedAt: clock.toISOString() },
      clock.toISOString(),
    );
    server.seedRow(USER, 'recipient', recipient.id, recipient, clock.toISOString());
    const cloudRecipient = makeRecipient({
      id: '22222222-2222-4222-8222-ffffffffffff' as never,
      seasonId: season.id,
      name: 'Cloud cousin',
    });
    server.seedRow(USER, 'recipient', cloudRecipient.id, cloudRecipient, clock.toISOString());

    const result = await connectAccount(context(), {
      userId: USER,
      email: 'alex@example.com',
      confirmation: CONNECT_CONFIRMATION,
      backupTaken: true,
    });

    expect(result.plan.mode).toBe('merge');
    expect((await storage.db.seasons.get(season.id))?.name).toBe('Christmas 2026');
    expect(await storage.db.recipients.get(cloudRecipient.id)).toMatchObject({
      name: 'Cloud cousin',
    });
    expect(server.row(USER, 'season', season.id)?.data).toMatchObject({ name: 'Cloud season' });

    const conflicts = await storage.db.syncConflicts.toArray();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ entityType: 'season', entityId: season.id });

    expect(await storage.db.seasons.count()).toBe(1);
    expect(await storage.db.recipients.count()).toBe(2);
    expect(await storage.db.gifts.count()).toBe(1);
  });

  it('refuses to link a device that already belongs to another account', async () => {
    await seedLocal();
    await linkDevice(storage.db, {
      userId: OTHER_USER,
      email: 'other@example.com',
      at: clock.toISOString(),
    });

    await expect(
      connectAccount(context(), {
        userId: USER,
        email: 'alex@example.com',
        confirmation: CONNECT_CONFIRMATION,
        backupTaken: true,
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect((await readSyncLink(storage.db))?.userId).toBe(OTHER_USER);
  });
});
