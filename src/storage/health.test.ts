import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { healthCheck } from './health';
import { createTestStorage, type TestStorage } from '../test/storage';
import {
  FIXED_IDS,
  FIXED_TIMESTAMP,
  makeGift,
  makeIdea,
  makeRecipient,
  makeSeason,
} from '../test/fixtures';

let storage: TestStorage;

beforeEach(async () => {
  storage = await createTestStorage();
});

afterEach(async () => {
  await storage.cleanup();
});

async function createHealthyData() {
  const season = await storage.repositories.seasons.create({
    name: 'Christmas 2026',
    holidayDate: '2026-12-25',
    budgetMinor: 50000,
  });
  const recipient = await storage.repositories.recipients.create({
    seasonId: season.id,
    name: 'Alex',
    relationship: 'Family',
    budgetCapMinor: 15000,
    notes: 'Sensitive note',
  });
  const gift = await storage.repositories.gifts.create({
    seasonId: season.id,
    recipientId: recipient.id,
    name: 'Warm scarf',
    address: 'Secret Street 1',
    notes: 'Sensitive gift note',
  });
  const idea = await storage.repositories.ideas.create({
    seasonId: season.id,
    recipientId: recipient.id,
    name: 'Book of walks',
  });

  return { season, recipient, gift, idea };
}

describe('storage health check', () => {
  it('reports healthy counts and storage fields without mutating data', async () => {
    await createHealthyData();
    const before = await snapshot();

    const report = await healthCheck(storage.db);

    expect(report.ok).toBe(true);
    expect(report.databaseVersion).toBe(1);
    expect(report.counts).toEqual({
      seasons: 1,
      activeSeasons: 1,
      archivedSeasons: 0,
      recipients: 1,
      gifts: 1,
      ideas: 1,
    });
    expect(report.storage).toEqual({
      usageBytes: null,
      quotaBytes: null,
      persisted: null,
    });
    expect(report.issues).toEqual([]);
    expect(await snapshot()).toEqual(before);
  });

  it('reports multiple active seasons and an invalid selected season', async () => {
    const { season } = await createHealthyData();
    await storage.db.seasons.add(
      makeSeason({
        id: FIXED_IDS.otherSeason as ReturnType<typeof makeSeason>['id'],
        name: 'Second active season',
      }),
    );

    const report = await healthCheck(storage.db);

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['MULTIPLE_ACTIVE_SEASONS']),
    );
    expect(report.counts.activeSeasons).toBe(2);
    expect(season.id).toBeDefined();

    await storage.db.settings.update('app', {
      activeSeasonId: FIXED_IDS.otherSeason as ReturnType<typeof makeSeason>['id'],
    });
    const archivedReport = await (async () => {
      await storage.db.seasons.update(
        FIXED_IDS.otherSeason as ReturnType<typeof makeSeason>['id'],
        { status: 'archived' },
      );
      return healthCheck(storage.db);
    })();

    expect(archivedReport.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['ACTIVE_SEASON_INVALID']),
    );
    expect(archivedReport.issues.map((issue) => issue.code)).not.toContain(
      'MULTIPLE_ACTIVE_SEASONS',
    );
  });

  it('reports orphans, cross-season references, and status violations', async () => {
    const { season, recipient } = await createHealthyData();
    await storage.db.seasons.add(
      makeSeason({
        id: FIXED_IDS.otherSeason as ReturnType<typeof makeSeason>['id'],
        name: 'Archived other season',
        status: 'archived',
        archivedAt: FIXED_TIMESTAMP,
      }),
    );
    await storage.db.recipients.add(
      makeRecipient({
        id: FIXED_IDS.otherRecipient as ReturnType<typeof makeRecipient>['id'],
        seasonId: FIXED_IDS.otherSeason as ReturnType<typeof makeRecipient>['seasonId'],
        name: 'Sam',
      }),
    );
    await storage.db.recipients.add(
      makeRecipient({
        id: '22222222-2222-4222-8222-444444444444' as ReturnType<typeof makeRecipient>['id'],
        seasonId: '11111111-1111-4111-8111-999999999999' as ReturnType<
          typeof makeRecipient
        >['seasonId'],
        name: 'Orphan',
      }),
    );
    await storage.db.gifts.add(
      makeGift({
        id: '33333333-3333-4333-8333-555555555555' as ReturnType<typeof makeGift>['id'],
        seasonId: season.id,
        recipientId: FIXED_IDS.otherRecipient as ReturnType<typeof makeGift>['recipientId'],
        name: 'Cross-season gift',
        wrapped: true,
        wrappedOn: '2026-12-20',
      }),
    );
    await storage.db.gifts.add(
      makeGift({
        id: '33333333-3333-4333-8333-666666666666' as ReturnType<typeof makeGift>['id'],
        seasonId: season.id,
        recipientId: '22222222-2222-4222-8222-999999999999' as ReturnType<
          typeof makeGift
        >['recipientId'],
        name: 'Missing recipient gift',
      }),
    );
    await storage.db.ideas.add(
      makeIdea({
        id: '44444444-4444-4444-8444-555555555555' as ReturnType<typeof makeIdea>['id'],
        seasonId: season.id,
        recipientId: FIXED_IDS.otherRecipient as ReturnType<typeof makeIdea>['recipientId'],
        name: 'Cross-season idea',
        status: 'converted',
        convertedGiftId: '33333333-3333-4333-8333-777777777777' as NonNullable<
          ReturnType<typeof makeIdea>['convertedGiftId']
        >,
        convertedAt: FIXED_TIMESTAMP,
      }),
    );
    await storage.db.gifts.add(
      makeGift({
        id: '33333333-3333-4333-8333-888888888888' as ReturnType<typeof makeGift>['id'],
        seasonId: season.id,
        recipientId: recipient.id,
        name: 'Missing source idea gift',
        sourceIdeaId: '44444444-4444-4444-8444-999999999999' as NonNullable<
          ReturnType<typeof makeGift>['sourceIdeaId']
        >,
      }),
    );

    const report = await healthCheck(storage.db);
    const codes = report.issues.map((issue) => issue.code);

    expect(report.ok).toBe(false);
    expect(codes).toEqual(
      expect.arrayContaining([
        'ORPHAN_RECORD',
        'GIFT_RECIPIENT_MISSING',
        'GIFT_RECIPIENT_SEASON_MISMATCH',
        'GIFT_SOURCE_IDEA_MISSING',
        'IDEA_RECIPIENT_SEASON_MISMATCH',
        'IDEA_GIFT_MISSING',
        'GIFT_STATUS_INVARIANT',
      ]),
    );
    expect(recipient.id).toBeDefined();
  });

  it('reports missing settings and invalid records without exposing personal data', async () => {
    const { recipient } = await createHealthyData();
    await storage.db.gifts.add(
      makeGift({
        id: '33333333-3333-4333-8333-888888888888' as ReturnType<typeof makeGift>['id'],
        seasonId: FIXED_IDS.season as ReturnType<typeof makeGift>['seasonId'],
        recipientId: recipient.id,
        name: 'Invalid gift',
        boughtOn: '2026-02-30',
      }),
    );
    await storage.db.settings.delete('app');

    const report = await healthCheck(storage.db);
    const serialized = JSON.stringify(report);

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SETTINGS_MISSING', 'INVALID_RECORD']),
    );
    expect(serialized).not.toContain('Alex');
    expect(serialized).not.toContain('Sensitive note');
    expect(serialized).not.toContain('Secret Street');
    expect(serialized).not.toContain('Warm scarf');
    expect(serialized).not.toContain('Sensitive gift note');
  });

  it('warns when an active season exists but settings selects none', async () => {
    const { season } = await createHealthyData();
    await storage.db.settings.update('app', { activeSeasonId: null });

    const report = await healthCheck(storage.db);

    expect(report.ok).toBe(true);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ACTIVE_SEASON_NOT_SELECTED', severity: 'warning' }),
      ]),
    );
    expect(season.id).toBeDefined();
  });
});

async function snapshot() {
  return {
    seasons: await storage.db.seasons.toArray(),
    recipients: await storage.db.recipients.toArray(),
    gifts: await storage.db.gifts.toArray(),
    ideas: await storage.db.ideas.toArray(),
    settings: await storage.db.settings.toArray(),
  };
}
