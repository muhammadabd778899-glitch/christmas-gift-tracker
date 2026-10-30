import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../domain/errors';
import { MAX_BACKUP_BYTES } from './backup';
import { createTestStorage, type TestStorage } from '../test/storage';

let storage: TestStorage;

beforeEach(async () => {
  storage = await createTestStorage();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await storage.cleanup();
});

async function seedTwoSeasons() {
  const first = await storage.repositories.seasons.create({
    name: 'Christmas 2025',
    holidayDate: '2025-12-25',
    budgetMinor: 40000,
  });
  const alex = await storage.repositories.recipients.create({
    seasonId: first.id,
    name: 'Alex',
    relationship: 'Family',
    budgetCapMinor: 15000,
    notes: 'Practical gifts.',
  });
  await storage.repositories.gifts.create({
    seasonId: first.id,
    recipientId: alex.id,
    name: 'Wool scarf',
    plannedBudgetMinor: 3500,
    actualCostMinor: 3200,
    bought: true,
    boughtOn: '2025-11-14',
    address: '12 Sample Street',
    notes: 'Navy blue.',
  });
  await storage.repositories.ideas.create({
    seasonId: first.id,
    recipientId: alex.id,
    name: 'Book of walks',
  });
  await storage.repositories.seasons.archive(first.id);

  const second = await storage.repositories.seasons.create(
    { name: 'Christmas 2026', holidayDate: '2026-12-25', budgetMinor: 50000 },
    { copyRecipientsFromId: first.id },
  );
  const copied = await storage.repositories.recipients.listBySeason(second.id);
  await storage.repositories.gifts.create({
    seasonId: second.id,
    recipientId: copied[0]!.id,
    name: 'Board game',
    plannedBudgetMinor: 4500,
  });

  return { first, second };
}

function backupFile(content: string, name = 'backup.json') {
  return new File([content], name, { type: 'application/json' });
}

async function parseEnvelope(content: string) {
  return JSON.parse(content) as {
    format: string;
    formatVersion: number;
    schemaVersion: number;
    appVersion: string;
    exportedAt: string;
    data: {
      settings: { activeSeasonId: string | null };
      seasons: Array<Record<string, unknown> & { id: string; name: string; status: string }>;
      recipients: Array<Record<string, unknown> & { id: string; seasonId: string; name: string }>;
      gifts: Array<
        Record<string, unknown> & {
          id: string;
          seasonId: string;
          recipientId: string;
          name: string;
        }
      >;
      ideas: Array<Record<string, unknown> & { id: string; seasonId: string; name: string }>;
    };
  };
}

describe('JSON backup export', () => {
  it('includes settings, every season, and all records with format and schema versions', async () => {
    await seedTwoSeasons();

    const backup = await storage.repositories.data.exportBackup();
    const envelope = await parseEnvelope(backup.content);

    expect(envelope.format).toBe('christmas-gift-tracker-backup');
    expect(envelope.formatVersion).toBe(1);
    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.appVersion).toBe('0.2.0-test');
    expect(backup.filename).toMatch(/^christmas-gift-tracker-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(envelope.data.seasons).toHaveLength(2);
    expect(envelope.data.recipients).toHaveLength(2);
    expect(envelope.data.gifts).toHaveLength(2);
    expect(envelope.data.ideas).toHaveLength(1);
    expect(backup.summary).toMatchObject({
      seasons: 2,
      activeSeasons: 1,
      archivedSeasons: 1,
      recipients: 2,
      gifts: 2,
      ideas: 1,
    });
    expect(backup.summary.exportedAt).toBe('2026-10-26T12:00:00.000Z');
  });
});

describe('JSON backup restore', () => {
  it('round-trips counts, identifiers, relationships, statuses, and settings exactly', async () => {
    await seedTwoSeasons();
    const databaseId = (await storage.db.meta.get('databaseId'))?.value;
    const backup = await storage.repositories.data.exportBackup();
    const envelope = await parseEnvelope(backup.content);

    await storage.repositories.data.resetAllData('DELETE');
    expect(await storage.db.seasons.count()).toBe(0);

    const file = backupFile(backup.content);
    const validation = await storage.repositories.data.validateBackup(file);

    expect(validation.summary).toEqual(backup.summary);

    await storage.repositories.data.restoreBackup(file, 'RESTORE');

    const [settings, seasons, recipients, gifts, ideas] = await Promise.all([
      storage.db.settings.get('app'),
      storage.db.seasons.toArray(),
      storage.db.recipients.toArray(),
      storage.db.gifts.toArray(),
      storage.db.ideas.toArray(),
    ]);

    expect(settings).toEqual(envelope.data.settings);
    expect(seasons).toHaveLength(2);
    expect(recipients).toHaveLength(2);
    expect(gifts).toHaveLength(2);
    expect(ideas).toHaveLength(1);
    expect(seasons.find((season) => season.status === 'active')?.id).toBe(
      envelope.data.settings.activeSeasonId,
    );
    expect((await storage.db.meta.get('databaseId'))?.value).toBe(databaseId);
    expect(gifts.find((gift) => gift.name === 'Wool scarf')?.notes).toBe('Navy blue.');
  });

  it('requires the exact RESTORE confirmation and changes nothing when it is wrong', async () => {
    await seedTwoSeasons();
    const backup = await storage.repositories.data.exportBackup();
    const before = await storage.repositories.seasons.list();

    await expect(
      storage.repositories.data.restoreBackup(backupFile(backup.content), 'restore'),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(await storage.repositories.seasons.list()).toEqual(before);
  });

  it('leaves the previous data intact when the write transaction fails', async () => {
    await seedTwoSeasons();
    const backup = await storage.repositories.data.exportBackup();

    await storage.repositories.data.resetAllData('DELETE');
    const marker = await storage.repositories.seasons.create({
      name: 'Marker season',
      holidayDate: '2027-12-25',
    });
    await storage.repositories.recipients.create({
      seasonId: marker.id,
      name: 'Marker person',
    });

    vi.spyOn(storage.db.recipients, 'bulkAdd').mockRejectedValueOnce(
      new Error('forced failure during restore'),
    );

    await expect(
      storage.repositories.data.restoreBackup(backupFile(backup.content), 'RESTORE'),
    ).rejects.toThrow();

    expect((await storage.repositories.seasons.list()).map((season) => season.name)).toEqual([
      'Marker season',
    ]);
    expect(await storage.db.recipients.count()).toBe(1);
    expect(await storage.db.gifts.count()).toBe(0);
    expect(await storage.db.ideas.count()).toBe(0);
  });
});

describe('invalid backups', () => {
  async function exportedEnvelope() {
    await seedTwoSeasons();
    return parseEnvelope((await storage.repositories.data.exportBackup()).content);
  }

  it('rejects a file that is not JSON', async () => {
    await expect(storage.repositories.data.validateBackup(backupFile('not json'))).rejects.toThrow(
      /not valid JSON/,
    );
  });

  it('rejects a different format marker', async () => {
    const envelope = await exportedEnvelope();
    envelope.format = 'some-other-app';

    await expect(
      storage.repositories.data.validateBackup(backupFile(JSON.stringify(envelope))),
    ).rejects.toThrow(/not a Christmas Gift Tracker backup/);
  });

  it('rejects a newer schema version with a clear message', async () => {
    const envelope = await exportedEnvelope();
    envelope.schemaVersion = 2;

    await expect(
      storage.repositories.data.validateBackup(backupFile(JSON.stringify(envelope))),
    ).rejects.toThrow(/newer version of the planner/);
  });

  it('rejects an older schema version instead of importing it partially', async () => {
    const envelope = await exportedEnvelope();
    envelope.schemaVersion = 0;

    await expect(
      storage.repositories.data.validateBackup(backupFile(JSON.stringify(envelope))),
    ).rejects.toThrow(/No safe migration/);
  });

  it('rejects dangling recipient references', async () => {
    const envelope = await exportedEnvelope();
    envelope.data.recipients.pop();

    await expect(
      storage.repositories.data.validateBackup(backupFile(JSON.stringify(envelope))),
    ).rejects.toThrow(/missing recipient/);
  });

  it('rejects cross-season references', async () => {
    const envelope = await exportedEnvelope();
    const archived = envelope.data.seasons.find((season) => season.status === 'archived')!;
    const active = envelope.data.seasons.find((season) => season.status === 'active')!;
    const activeGift = envelope.data.gifts.find((gift) => gift.seasonId === active.id)!;
    activeGift.seasonId = archived.id;

    await expect(
      storage.repositories.data.validateBackup(backupFile(JSON.stringify(envelope))),
    ).rejects.toThrow(/different season|missing recipient/);
  });

  it('rejects duplicate identifiers across record types', async () => {
    const envelope = await exportedEnvelope();
    envelope.data.recipients[1]!.id = envelope.data.recipients[0]!.id;

    await expect(
      storage.repositories.data.validateBackup(backupFile(JSON.stringify(envelope))),
    ).rejects.toThrow(/used by both/);
  });

  it('rejects settings that point at an archived season', async () => {
    const envelope = await exportedEnvelope();
    const archived = envelope.data.seasons.find((season) => season.status === 'archived')!;
    envelope.data.settings.activeSeasonId = archived.id;

    await expect(
      storage.repositories.data.validateBackup(backupFile(JSON.stringify(envelope))),
    ).rejects.toThrow(/not active/);
  });

  it('rejects invalid field values before writing', async () => {
    const envelope = await exportedEnvelope();
    (envelope.data.gifts[0] as Record<string, unknown>).plannedBudgetMinor = -1;

    await expect(
      storage.repositories.data.validateBackup(backupFile(JSON.stringify(envelope))),
    ).rejects.toThrow(/invalid records/);
  });

  it('rejects files above the 25 MB size limit', async () => {
    await expect(
      storage.repositories.data.validateBackup({
        size: MAX_BACKUP_BYTES + 1,
        text: async () => '{}',
      }),
    ).rejects.toThrow(/25 MB/);
  });
});
