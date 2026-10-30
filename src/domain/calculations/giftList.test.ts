import { describe, expect, it } from 'vitest';
import type { Gift, Recipient } from '../entities';
import {
  buildGiftCategories,
  buildGiftList,
  DEFAULT_GIFT_FILTERS,
  DEFAULT_GIFT_SORT,
  filterGifts,
  hasActiveGiftFilters,
  isDefaultGiftSort,
  normalizeGiftText,
  sortGifts,
} from './giftList';
import { makeGift, makeRecipient } from '../../test/fixtures';

const alex = makeRecipient({ id: 'recipient-alex' as Recipient['id'], name: 'Alex' });
const bea = makeRecipient({
  id: 'recipient-bea' as Recipient['id'],
  name: 'Béa',
  budgetCapMinor: 9000,
});
const chris = makeRecipient({
  id: 'recipient-chris' as Recipient['id'],
  name: 'Chris',
  budgetCapMinor: null,
});

function gift(id: string, overrides: Partial<Gift> = {}): Gift {
  return makeGift({ id: id as Gift['id'], ...overrides });
}

describe('normalizeGiftText', () => {
  it('ignores case, surrounding whitespace, and common diacritics', () => {
    expect(normalizeGiftText('  Café  ')).toBe('cafe');
    expect(normalizeGiftText('BÉA')).toBe('bea');
    expect(normalizeGiftText('Noël')).toBe('noel');
  });
});

describe('filterGifts', () => {
  const scarf = gift('gift-scarf', {
    name: 'Warm scarf',
    recipientId: alex.id,
    category: 'Clothing',
    store: 'Local market',
  });
  const book = gift('gift-book', {
    name: 'Book of walks',
    recipientId: bea.id,
    category: 'Books',
    store: 'Bookshop',
  });
  const lamp = gift('gift-lamp', {
    name: 'Reading lamp',
    recipientId: chris.id,
    category: 'Home',
    store: null,
  });
  const gifts = [scarf, book, lamp];
  const recipients = [alex, bea, chris];

  it('matches gift name, recipient, category, and store', () => {
    expect(filterGifts(gifts, recipients, { ...DEFAULT_GIFT_FILTERS, search: 'scarf' })).toEqual([
      scarf,
    ]);
    expect(filterGifts(gifts, recipients, { ...DEFAULT_GIFT_FILTERS, search: 'ALEX' })).toEqual([
      scarf,
    ]);
    expect(filterGifts(gifts, recipients, { ...DEFAULT_GIFT_FILTERS, search: 'books' })).toEqual([
      book,
    ]);
    expect(filterGifts(gifts, recipients, { ...DEFAULT_GIFT_FILTERS, search: 'bookshop' })).toEqual(
      [book],
    );
  });

  it('is case-insensitive, diacritic-insensitive, and substring-based', () => {
    expect(filterGifts(gifts, recipients, { ...DEFAULT_GIFT_FILTERS, search: 'BEA' })).toEqual([
      book,
    ]);
    expect(filterGifts(gifts, recipients, { ...DEFAULT_GIFT_FILTERS, search: 'Béa' })).toEqual([
      book,
    ]);
    expect(filterGifts(gifts, recipients, { ...DEFAULT_GIFT_FILTERS, search: 'amp' })).toEqual([
      lamp,
    ]);
  });

  it('combines search and filters with AND semantics', () => {
    expect(
      filterGifts(gifts, recipients, {
        ...DEFAULT_GIFT_FILTERS,
        search: 'book',
        recipientId: bea.id,
        category: 'books',
        bought: 'no',
      }),
    ).toEqual([book]);

    expect(
      filterGifts(gifts, recipients, {
        ...DEFAULT_GIFT_FILTERS,
        search: 'book',
        recipientId: alex.id,
      }),
    ).toEqual([]);
  });

  it('filters by recipient and category', () => {
    expect(
      filterGifts(gifts, recipients, {
        ...DEFAULT_GIFT_FILTERS,
        recipientId: alex.id,
      }),
    ).toEqual([scarf]);

    expect(
      filterGifts(gifts, recipients, {
        ...DEFAULT_GIFT_FILTERS,
        category: 'home',
      }),
    ).toEqual([lamp]);
  });

  it('treats bought, wrapped, and sent as independent tri-state filters', () => {
    const notStarted = gift('gift-not-started', {
      name: 'Not started',
      bought: false,
      wrapped: false,
      sent: false,
    });
    const bought = gift('gift-bought', {
      name: 'Bought',
      bought: true,
      wrapped: false,
      sent: false,
    });
    const wrapped = gift('gift-wrapped', {
      name: 'Wrapped',
      bought: true,
      wrapped: true,
      sent: false,
    });
    const sent = gift('gift-sent', {
      name: 'Sent',
      bought: true,
      wrapped: true,
      sent: true,
    });
    const statusGifts = [notStarted, bought, wrapped, sent];

    expect(
      filterGifts(statusGifts, recipients, { ...DEFAULT_GIFT_FILTERS, bought: 'yes' }),
    ).toEqual([bought, wrapped, sent]);
    expect(filterGifts(statusGifts, recipients, { ...DEFAULT_GIFT_FILTERS, bought: 'no' })).toEqual(
      [notStarted],
    );
    expect(
      filterGifts(statusGifts, recipients, { ...DEFAULT_GIFT_FILTERS, wrapped: 'yes' }),
    ).toEqual([wrapped, sent]);
    expect(
      filterGifts(statusGifts, recipients, { ...DEFAULT_GIFT_FILTERS, wrapped: 'no' }),
    ).toEqual([notStarted, bought]);
    expect(filterGifts(statusGifts, recipients, { ...DEFAULT_GIFT_FILTERS, sent: 'yes' })).toEqual([
      sent,
    ]);
    expect(filterGifts(statusGifts, recipients, { ...DEFAULT_GIFT_FILTERS, sent: 'no' })).toEqual([
      notStarted,
      bought,
      wrapped,
    ]);
  });

  it('does not mutate the source list', () => {
    const source = [scarf, book, lamp];
    const snapshot = [...source];

    filterGifts(source, recipients, { ...DEFAULT_GIFT_FILTERS, search: 'scarf' });

    expect(source).toEqual(snapshot);
  });
});

describe('sortGifts', () => {
  const apple = gift('gift-apple', {
    name: 'Apple',
    recipientId: alex.id,
    plannedBudgetMinor: 3000,
    actualCostMinor: 2800,
    bought: true,
    updatedAt: '2026-10-24T12:00:00.000Z',
  });
  const zebra = gift('gift-zebra', {
    name: 'Zebra',
    recipientId: alex.id,
    plannedBudgetMinor: null,
    actualCostMinor: null,
    bought: false,
    updatedAt: '2026-10-26T12:00:00.000Z',
  });
  const mango = gift('gift-mango', {
    name: 'Mango',
    recipientId: bea.id,
    plannedBudgetMinor: 1000,
    actualCostMinor: 1200,
    bought: true,
    wrapped: true,
    updatedAt: '2026-10-25T12:00:00.000Z',
  });
  const gifts = [zebra, mango, apple];
  const recipients = [alex, bea, chris];

  it('defaults to recipient A-Z and then gift name A-Z', () => {
    expect(sortGifts(gifts, recipients).map((item) => item.name)).toEqual([
      'Apple',
      'Zebra',
      'Mango',
    ]);
    expect(isDefaultGiftSort(DEFAULT_GIFT_SORT)).toBe(true);
  });

  it('sorts by gift name in both directions', () => {
    expect(
      sortGifts(gifts, recipients, { key: 'name', direction: 'asc' }).map((item) => item.name),
    ).toEqual(['Apple', 'Mango', 'Zebra']);
    expect(
      sortGifts(gifts, recipients, { key: 'name', direction: 'desc' }).map((item) => item.name),
    ).toEqual(['Zebra', 'Mango', 'Apple']);
  });

  it('sorts by planned and actual amounts with missing values last', () => {
    expect(
      sortGifts(gifts, recipients, { key: 'planned', direction: 'asc' }).map((item) => item.name),
    ).toEqual(['Mango', 'Apple', 'Zebra']);
    expect(
      sortGifts(gifts, recipients, { key: 'planned', direction: 'desc' }).map((item) => item.name),
    ).toEqual(['Apple', 'Mango', 'Zebra']);
    expect(
      sortGifts(gifts, recipients, { key: 'actual', direction: 'asc' }).map((item) => item.name),
    ).toEqual(['Mango', 'Apple', 'Zebra']);
    expect(
      sortGifts(gifts, recipients, { key: 'actual', direction: 'desc' }).map((item) => item.name),
    ).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  it('sorts by derived status in both directions', () => {
    expect(
      sortGifts(gifts, recipients, { key: 'status', direction: 'asc' }).map((item) => item.name),
    ).toEqual(['Zebra', 'Apple', 'Mango']);
    expect(
      sortGifts(gifts, recipients, { key: 'status', direction: 'desc' }).map((item) => item.name),
    ).toEqual(['Mango', 'Apple', 'Zebra']);
  });

  it('sorts by updated date in both directions', () => {
    expect(
      sortGifts(gifts, recipients, { key: 'updated', direction: 'asc' }).map((item) => item.name),
    ).toEqual(['Apple', 'Mango', 'Zebra']);
    expect(
      sortGifts(gifts, recipients, { key: 'updated', direction: 'desc' }).map((item) => item.name),
    ).toEqual(['Zebra', 'Mango', 'Apple']);
  });

  it('uses stable tie-breakers for equal values', () => {
    const first = gift('gift-a', { name: 'Same', recipientId: alex.id });
    const second = gift('gift-b', { name: 'Same', recipientId: alex.id });

    expect(
      sortGifts([second, first], recipients, { key: 'name', direction: 'asc' }).map(
        (item) => item.id,
      ),
    ).toEqual([first.id, second.id]);
  });

  it('does not mutate the source list', () => {
    const source = [zebra, mango, apple];
    const snapshot = [...source];

    sortGifts(source, recipients, { key: 'name', direction: 'asc' });

    expect(source).toEqual(snapshot);
  });
});

describe('buildGiftList', () => {
  it('filters and then sorts without mutating the source', () => {
    const first = gift('gift-first', {
      name: 'Zebra',
      recipientId: alex.id,
      category: 'Toys',
    });
    const second = gift('gift-second', {
      name: 'Apple',
      recipientId: alex.id,
      category: 'Toys',
    });
    const other = gift('gift-other', {
      name: 'Mango',
      recipientId: bea.id,
      category: 'Books',
    });
    const source = [first, other, second];

    expect(
      buildGiftList(
        source,
        [alex, bea],
        { ...DEFAULT_GIFT_FILTERS, recipientId: alex.id },
        { key: 'name', direction: 'asc' },
      ).map((item) => item.name),
    ).toEqual(['Apple', 'Zebra']);
    expect(source).toEqual([first, other, second]);
  });
});

describe('filter state helpers', () => {
  it('detects active filters and non-default sorting', () => {
    expect(hasActiveGiftFilters(DEFAULT_GIFT_FILTERS)).toBe(false);
    expect(hasActiveGiftFilters({ ...DEFAULT_GIFT_FILTERS, search: '  ' })).toBe(false);
    expect(hasActiveGiftFilters({ ...DEFAULT_GIFT_FILTERS, search: 'scarf' })).toBe(true);
    expect(hasActiveGiftFilters({ ...DEFAULT_GIFT_FILTERS, bought: 'no' })).toBe(true);
    expect(isDefaultGiftSort({ key: 'name', direction: 'asc' })).toBe(false);
    expect(isDefaultGiftSort({ key: 'recipient', direction: 'desc' })).toBe(false);
  });

  it('builds a sorted, case-insensitively deduplicated category list', () => {
    const gifts = [
      gift('gift-one', { category: 'books' }),
      gift('gift-two', { category: 'Books' }),
      gift('gift-three', { category: 'Home' }),
      gift('gift-four', { category: null }),
      gift('gift-five', { category: '  ' }),
    ];

    expect(buildGiftCategories(gifts)).toEqual(['books', 'Home']);
  });
});
