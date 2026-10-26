import type { AppSettings, Gift, Idea, Recipient, Season } from '../domain/entities';

export const FIXED_NOW = new Date('2026-10-26T12:00:00.000Z');
export const FIXED_TIMESTAMP = '2026-10-26T12:00:00.000Z';

export const fixedNow = (): Date => new Date(FIXED_NOW);

export const FIXED_IDS = {
  season: '11111111-1111-4111-8111-111111111111',
  otherSeason: '11111111-1111-4111-8111-222222222222',
  recipient: '22222222-2222-4222-8222-222222222222',
  otherRecipient: '22222222-2222-4222-8222-333333333333',
  gift: '33333333-3333-4333-8333-333333333333',
  idea: '44444444-4444-4444-8444-444444444444',
  giftFromIdea: '33333333-3333-4333-8333-444444444444',
  database: '66666666-6666-4666-8666-666666666666',
} as const;

export function makeSeason(overrides: Partial<Season> = {}): Season {
  return {
    id: FIXED_IDS.season as Season['id'],
    name: 'Christmas 2026',
    holidayDate: '2026-12-25',
    budgetMinor: 50000,
    status: 'active',
    isSample: false,
    archivedAt: null,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
    ...overrides,
  };
}

export function makeRecipient(overrides: Partial<Recipient> = {}): Recipient {
  return {
    id: FIXED_IDS.recipient as Recipient['id'],
    seasonId: FIXED_IDS.season as Recipient['seasonId'],
    name: 'Alex',
    relationship: 'Family',
    budgetCapMinor: 15000,
    notes: 'Prefers practical gifts.',
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
    ...overrides,
  };
}

export function makeGift(overrides: Partial<Gift> = {}): Gift {
  return {
    id: FIXED_IDS.gift as Gift['id'],
    seasonId: FIXED_IDS.season as Gift['seasonId'],
    recipientId: FIXED_IDS.recipient as Gift['recipientId'],
    name: 'Warm scarf',
    category: 'Clothing',
    store: 'Local market',
    purchaseUrl: 'https://example.com/scarf',
    plannedBudgetMinor: 2500,
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
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
    ...overrides,
  };
}

export function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: FIXED_IDS.idea as Idea['id'],
    seasonId: FIXED_IDS.season as Idea['seasonId'],
    recipientId: FIXED_IDS.recipient as Idea['recipientId'],
    name: 'Book of walks',
    category: 'Books',
    store: 'Bookshop',
    purchaseUrl: null,
    estimatedPriceMinor: 1800,
    notes: null,
    status: 'active',
    convertedGiftId: null,
    convertedAt: null,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
    ...overrides,
  };
}

export function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    id: 'app',
    activeSeasonId: null,
    currencyCode: 'USD',
    currencySymbol: '$',
    fractionDigits: 2,
    locale: 'en-US',
    theme: 'system',
    hasCompletedOnboarding: false,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
    ...overrides,
  };
}
