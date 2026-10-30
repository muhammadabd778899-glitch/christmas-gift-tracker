import type { Gift, Recipient } from '../entities';
import { giftStatus, type GiftStatus } from './gifts';

export type GiftTriState = 'any' | 'yes' | 'no';
export type GiftSortKey = 'recipient' | 'name' | 'planned' | 'actual' | 'status' | 'updated';
export type GiftSortDirection = 'asc' | 'desc';

export interface GiftFilters {
  search: string;
  recipientId: string | null;
  category: string | null;
  bought: GiftTriState;
  wrapped: GiftTriState;
  sent: GiftTriState;
}

export interface GiftSort {
  key: GiftSortKey;
  direction: GiftSortDirection;
}

export const DEFAULT_GIFT_FILTERS: GiftFilters = {
  search: '',
  recipientId: null,
  category: null,
  bought: 'any',
  wrapped: 'any',
  sent: 'any',
};

export const DEFAULT_GIFT_SORT: GiftSort = {
  key: 'recipient',
  direction: 'asc',
};

const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * Normalize search and comparison text. The gift search is intentionally
 * forgiving: case, surrounding whitespace, and common Latin diacritics are
 * ignored, while the stored text is never changed.
 */
export function normalizeGiftText(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS, '').toLocaleLowerCase().trim();
}

function recipientName(
  gift: Pick<Gift, 'recipientId'>,
  recipientsById: ReadonlyMap<string, Recipient>,
): string {
  return recipientsById.get(gift.recipientId)?.name ?? '';
}

function matchesTriState(value: boolean, filter: GiftTriState): boolean {
  if (filter === 'any') return true;
  return filter === 'yes' ? value : !value;
}

function compareText(left: string, right: string): number {
  return (
    normalizeGiftText(left).localeCompare(normalizeGiftText(right)) || left.localeCompare(right)
  );
}

function compareNullableNumber(
  left: number | null,
  right: number | null,
  direction: GiftSortDirection,
): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === 'asc' ? left - right : right - left;
}

const STATUS_ORDER: Record<GiftStatus, number> = {
  not_started: 0,
  bought: 1,
  wrapped: 2,
  sent: 3,
};

function compareByKey(
  left: Gift,
  right: Gift,
  sort: GiftSort,
  recipientsById: ReadonlyMap<string, Recipient>,
): number {
  const direction = sort.direction === 'asc' ? 1 : -1;

  switch (sort.key) {
    case 'recipient':
      return (
        direction *
        compareText(recipientName(left, recipientsById), recipientName(right, recipientsById))
      );
    case 'name':
      return direction * compareText(left.name, right.name);
    case 'planned':
      return compareNullableNumber(
        left.plannedBudgetMinor,
        right.plannedBudgetMinor,
        sort.direction,
      );
    case 'actual':
      return compareNullableNumber(left.actualCostMinor, right.actualCostMinor, sort.direction);
    case 'status':
      return direction * (STATUS_ORDER[giftStatus(left)] - STATUS_ORDER[giftStatus(right)]);
    case 'updated':
      return direction * left.updatedAt.localeCompare(right.updatedAt);
    default:
      return 0;
  }
}

function compareGifts(
  left: Gift,
  right: Gift,
  sort: GiftSort,
  recipientsById: ReadonlyMap<string, Recipient>,
): number {
  const primary = compareByKey(left, right, sort, recipientsById);

  if (primary !== 0) {
    return primary;
  }

  // Stable tie-breakers keep the table deterministic for equal values.
  return (
    compareText(left.name, right.name) ||
    compareText(recipientName(left, recipientsById), recipientName(right, recipientsById)) ||
    left.id.localeCompare(right.id)
  );
}

export function filterGifts(
  gifts: readonly Gift[],
  recipients: readonly Recipient[],
  filters: GiftFilters,
): Gift[] {
  const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
  const needle = normalizeGiftText(filters.search);
  const category = filters.category ? normalizeGiftText(filters.category) : null;

  return gifts.filter((gift) => {
    if (filters.recipientId !== null && gift.recipientId !== filters.recipientId) {
      return false;
    }

    if (category !== null && normalizeGiftText(gift.category ?? '') !== category) {
      return false;
    }

    if (!matchesTriState(gift.bought, filters.bought)) return false;
    if (!matchesTriState(gift.wrapped, filters.wrapped)) return false;
    if (!matchesTriState(gift.sent, filters.sent)) return false;

    if (needle !== '') {
      const haystack = [
        gift.name,
        gift.category ?? '',
        gift.store ?? '',
        recipientName(gift, recipientsById),
      ].join('\n');

      if (!normalizeGiftText(haystack).includes(needle)) {
        return false;
      }
    }

    return true;
  });
}

export function sortGifts(
  gifts: readonly Gift[],
  recipients: readonly Recipient[],
  sort: GiftSort = DEFAULT_GIFT_SORT,
): Gift[] {
  const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
  return [...gifts].sort((left, right) => compareGifts(left, right, sort, recipientsById));
}

export function buildGiftList(
  gifts: readonly Gift[],
  recipients: readonly Recipient[],
  filters: GiftFilters,
  sort: GiftSort = DEFAULT_GIFT_SORT,
): Gift[] {
  return sortGifts(filterGifts(gifts, recipients, filters), recipients, sort);
}

export function hasActiveGiftFilters(filters: GiftFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.recipientId !== null ||
    filters.category !== null ||
    filters.bought !== 'any' ||
    filters.wrapped !== 'any' ||
    filters.sent !== 'any'
  );
}

export function isDefaultGiftSort(sort: GiftSort): boolean {
  return sort.key === DEFAULT_GIFT_SORT.key && sort.direction === DEFAULT_GIFT_SORT.direction;
}

export function buildGiftCategories(gifts: readonly Gift[]): string[] {
  const categories = new Map<string, string>();

  for (const gift of gifts) {
    const category = gift.category?.trim();

    if (!category) continue;

    const key = normalizeGiftText(category);

    if (!categories.has(key)) {
      categories.set(key, category);
    }
  }

  return [...categories.values()].sort(compareText);
}
