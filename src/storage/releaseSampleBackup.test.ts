import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sampleBackupContent from '../../release/Sample-Data/Sample-Backup.json?raw';
import { APP_VERSION } from '../lib/appInfo';
import { createTestStorage, type TestStorage } from '../test/storage';

let storage: TestStorage;

beforeEach(async () => {
  storage = await createTestStorage();
});

afterEach(async () => {
  await storage.cleanup();
});

async function readSampleBackup() {
  return {
    name: 'Sample-Backup.json',
    size: new TextEncoder().encode(sampleBackupContent).length,
    text: async () => sampleBackupContent,
  };
}

describe('shipped sample backup', () => {
  it('validates against the current schema and reports the documented contents', async () => {
    const validation = await storage.repositories.data.validateBackup(await readSampleBackup());

    expect(validation.envelope.format).toBe('christmas-gift-tracker-backup');
    expect(validation.envelope.schemaVersion).toBe(2);
    expect(validation.envelope.appVersion).toBe(APP_VERSION);
    expect(validation.summary).toMatchObject({
      seasons: 1,
      activeSeasons: 1,
      archivedSeasons: 0,
      sampleSeasons: 1,
      recipients: 2,
      gifts: 3,
      ideas: 2,
    });
  });

  it('restores every record and the display settings into an empty planner', async () => {
    const file = await readSampleBackup();

    expect(await storage.db.seasons.count()).toBe(0);
    await storage.repositories.data.restoreBackup(file, 'RESTORE');

    const [settings, seasons, recipients, gifts, ideas] = await Promise.all([
      storage.db.settings.get('app'),
      storage.db.seasons.toArray(),
      storage.db.recipients.toArray(),
      storage.db.gifts.toArray(),
      storage.db.ideas.toArray(),
    ]);

    expect(settings).toMatchObject({
      activeSeasonId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      currencyCode: 'USD',
      currencySymbol: '$',
      theme: 'light',
    });
    expect(seasons).toHaveLength(1);
    expect(seasons[0]).toMatchObject({
      name: 'Sample Christmas',
      budgetMinor: 45000,
      status: 'active',
      isSample: true,
    });
    expect(recipients.map((recipient) => recipient.name).sort()).toEqual(['Alex', 'Priya']);
    expect(gifts.map((gift) => gift.name).sort()).toEqual([
      'Board game',
      'Ceramics workshop voucher',
      'Wool scarf',
    ]);
    expect(ideas.map((idea) => idea.name).sort()).toEqual(['Audiobook subscription', 'Cosy throw']);
    expect(gifts.every((gift) => gift.seasonId === seasons[0]!.id)).toBe(true);
    expect(recipients.every((recipient) => recipient.seasonId === seasons[0]!.id)).toBe(true);
    expect(ideas.every((idea) => idea.seasonId === seasons[0]!.id)).toBe(true);
  });
});
