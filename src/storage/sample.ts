import type { Gift, Idea, Recipient, Season, SeasonId } from '../domain/entities';
import {
  giftEntitySchema,
  ideaEntitySchema,
  parseWithSchema,
  recipientEntitySchema,
  seasonEntitySchema,
  settingsEntitySchema,
} from '../domain/schemas';
import { withStorageErrors } from './errors';
import { readSettings, type RepositoryContext } from './repositories/context';

export const SAMPLE_SEASON_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' as SeasonId;

const SAMPLE_RECIPIENT_IDS = {
  alex: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  priya: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
} as const;

const SAMPLE_GIFT_IDS = {
  scarf: 'd4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f7a',
  boardGame: 'e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7a8b',
  workshop: 'f6a7b8c9-d0e1-4f2a-9b3c-4d5e6f7a8b9c',
} as const;

const SAMPLE_IDEA_IDS = {
  audiobook: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  throw: '1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
} as const;

export interface LoadSampleDataResult {
  created: boolean;
  season: Season;
  active: boolean;
}

export interface RemoveSampleDataResult {
  removedSeasons: number;
  removedRecipients: number;
  removedGifts: number;
  removedIdeas: number;
}

interface SampleRecords {
  season: Season;
  recipients: Recipient[];
  gifts: Gift[];
  ideas: Idea[];
}

function sampleRecords(status: Season['status'], timestamp: string): SampleRecords {
  const season = parseWithSchema(
    seasonEntitySchema,
    {
      id: SAMPLE_SEASON_ID,
      name: 'Sample Christmas',
      holidayDate: '2026-12-25',
      budgetMinor: 45_000,
      status,
      isSample: true,
      archivedAt: status === 'archived' ? timestamp : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    'The sample season could not be prepared.',
  );

  const recipients = [
    parseWithSchema(
      recipientEntitySchema,
      {
        id: SAMPLE_RECIPIENT_IDS.alex,
        seasonId: SAMPLE_SEASON_ID,
        name: 'Alex',
        relationship: 'Family',
        budgetCapMinor: 15_000,
        notes: 'Loves practical gifts and warm socks.',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      'A sample recipient could not be prepared.',
    ),
    parseWithSchema(
      recipientEntitySchema,
      {
        id: SAMPLE_RECIPIENT_IDS.priya,
        seasonId: SAMPLE_SEASON_ID,
        name: 'Priya',
        relationship: 'Friend',
        budgetCapMinor: 10_000,
        notes: 'Prefers experiences over objects.',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      'A sample recipient could not be prepared.',
    ),
  ];

  const gifts = [
    parseWithSchema(
      giftEntitySchema,
      {
        id: SAMPLE_GIFT_IDS.scarf,
        seasonId: SAMPLE_SEASON_ID,
        recipientId: SAMPLE_RECIPIENT_IDS.alex,
        name: 'Wool scarf',
        category: 'Clothing',
        store: 'Local market',
        purchaseUrl: null,
        plannedBudgetMinor: 3500,
        actualCostMinor: 3200,
        bought: true,
        boughtOn: '2026-11-14',
        wrapped: true,
        wrappedOn: '2026-12-10',
        sent: false,
        sentOn: null,
        deliveryMethod: 'hand_delivered',
        address: '12 Sample Street',
        notes: 'Navy blue.',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      'A sample gift could not be prepared.',
    ),
    parseWithSchema(
      giftEntitySchema,
      {
        id: SAMPLE_GIFT_IDS.boardGame,
        seasonId: SAMPLE_SEASON_ID,
        recipientId: SAMPLE_RECIPIENT_IDS.alex,
        name: 'Board game',
        category: 'Games',
        store: 'High street toys',
        purchaseUrl: null,
        plannedBudgetMinor: 4500,
        actualCostMinor: null,
        bought: false,
        boughtOn: null,
        wrapped: false,
        wrappedOn: null,
        sent: false,
        sentOn: null,
        deliveryMethod: null,
        address: null,
        notes: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      'A sample gift could not be prepared.',
    ),
    parseWithSchema(
      giftEntitySchema,
      {
        id: SAMPLE_GIFT_IDS.workshop,
        seasonId: SAMPLE_SEASON_ID,
        recipientId: SAMPLE_RECIPIENT_IDS.priya,
        name: 'Ceramics workshop voucher',
        category: 'Experience',
        store: 'Studio visits',
        purchaseUrl: null,
        plannedBudgetMinor: 6000,
        actualCostMinor: 6000,
        bought: true,
        boughtOn: '2026-11-20',
        wrapped: false,
        wrappedOn: null,
        sent: true,
        sentOn: '2026-11-21',
        deliveryMethod: 'digital',
        address: null,
        notes: 'Booked for January.',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      'A sample gift could not be prepared.',
    ),
  ];

  const ideas = [
    parseWithSchema(
      ideaEntitySchema,
      {
        id: SAMPLE_IDEA_IDS.audiobook,
        seasonId: SAMPLE_SEASON_ID,
        recipientId: SAMPLE_RECIPIENT_IDS.priya,
        name: 'Audiobook subscription',
        category: 'Media',
        store: null,
        purchaseUrl: null,
        estimatedPriceMinor: 2500,
        notes: null,
        status: 'active',
        convertedGiftId: null,
        convertedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      'A sample idea could not be prepared.',
    ),
    parseWithSchema(
      ideaEntitySchema,
      {
        id: SAMPLE_IDEA_IDS.throw,
        seasonId: SAMPLE_SEASON_ID,
        recipientId: null,
        name: 'Cosy throw',
        category: 'Home',
        store: null,
        purchaseUrl: null,
        estimatedPriceMinor: 4000,
        notes: 'Unassigned idea from the sample bank.',
        status: 'active',
        convertedGiftId: null,
        convertedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      'A sample idea could not be prepared.',
    ),
  ];

  return { season, recipients, gifts, ideas };
}

export async function loadSampleData(context: RepositoryContext): Promise<LoadSampleDataResult> {
  return withStorageErrors(async () => {
    const { db } = context;

    return db.transaction(
      'rw',
      [db.seasons, db.recipients, db.gifts, db.ideas, db.settings],
      async () => {
        const seasons = await db.seasons.toArray();
        const existing = seasons.find((season) => season.isSample);

        if (existing) {
          return {
            created: false,
            season: parseWithSchema(
              seasonEntitySchema,
              existing,
              'The saved sample season is invalid.',
            ),
            active: existing.status === 'active',
          };
        }

        const realSeasons = seasons.filter((season) => !season.isSample);
        const hasActive = seasons.some((season) => season.status === 'active');
        const status: Season['status'] =
          realSeasons.length === 0 && !hasActive ? 'active' : 'archived';
        const timestamp = context.nowIso();
        const { season, recipients, gifts, ideas } = sampleRecords(status, timestamp);

        await db.seasons.add(season);
        await db.recipients.bulkAdd(recipients);
        await db.gifts.bulkAdd(gifts);
        await db.ideas.bulkAdd(ideas);

        if (status === 'active') {
          const settings = await readSettings(context);
          await db.settings.put(
            parseWithSchema(
              settingsEntitySchema,
              { ...settings, activeSeasonId: season.id, updatedAt: timestamp },
              'The sample season could not be selected.',
            ),
          );
        }

        return { created: true, season, active: status === 'active' };
      },
    );
  });
}

export async function removeSampleData(
  context: RepositoryContext,
): Promise<RemoveSampleDataResult> {
  return withStorageErrors(async () => {
    const { db } = context;

    return db.transaction(
      'rw',
      [db.seasons, db.recipients, db.gifts, db.ideas, db.settings],
      async () => {
        const sampleSeasons = (await db.seasons.toArray()).filter((season) => season.isSample);

        if (sampleSeasons.length === 0) {
          return { removedSeasons: 0, removedRecipients: 0, removedGifts: 0, removedIdeas: 0 };
        }

        let removedRecipients = 0;
        let removedGifts = 0;
        let removedIdeas = 0;

        for (const season of sampleSeasons) {
          removedGifts += await db.gifts.where('seasonId').equals(season.id).delete();
          removedIdeas += await db.ideas.where('seasonId').equals(season.id).delete();
          removedRecipients += await db.recipients.where('seasonId').equals(season.id).delete();
          await db.seasons.delete(season.id);
        }

        const settings = await readSettings(context);
        const sampleIds = new Set<string>(sampleSeasons.map((season) => season.id));

        if (settings.activeSeasonId !== null && sampleIds.has(settings.activeSeasonId)) {
          await db.settings.put(
            parseWithSchema(
              settingsEntitySchema,
              { ...settings, activeSeasonId: null, updatedAt: context.nowIso() },
              'The sample season selection could not be cleared.',
            ),
          );
        }

        return {
          removedSeasons: sampleSeasons.length,
          removedRecipients,
          removedGifts,
          removedIdeas,
        };
      },
    );
  });
}
