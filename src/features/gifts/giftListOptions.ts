import { DEFAULT_GIFT_SORT, type GiftSort } from '../../domain/calculations/giftList';

export interface GiftSortOption {
  value: string;
  label: string;
  sort: GiftSort;
}

export const GIFT_SORT_OPTIONS: readonly GiftSortOption[] = [
  { value: 'recipient-asc', label: 'Recipient A–Z', sort: { key: 'recipient', direction: 'asc' } },
  {
    value: 'recipient-desc',
    label: 'Recipient Z–A',
    sort: { key: 'recipient', direction: 'desc' },
  },
  { value: 'name-asc', label: 'Gift name A–Z', sort: { key: 'name', direction: 'asc' } },
  { value: 'name-desc', label: 'Gift name Z–A', sort: { key: 'name', direction: 'desc' } },
  {
    value: 'planned-asc',
    label: 'Planned budget: low to high',
    sort: { key: 'planned', direction: 'asc' },
  },
  {
    value: 'planned-desc',
    label: 'Planned budget: high to low',
    sort: { key: 'planned', direction: 'desc' },
  },
  {
    value: 'actual-asc',
    label: 'Actual cost: low to high',
    sort: { key: 'actual', direction: 'asc' },
  },
  {
    value: 'actual-desc',
    label: 'Actual cost: high to low',
    sort: { key: 'actual', direction: 'desc' },
  },
  {
    value: 'status-asc',
    label: 'Status: not started first',
    sort: { key: 'status', direction: 'asc' },
  },
  {
    value: 'status-desc',
    label: 'Status: most complete first',
    sort: { key: 'status', direction: 'desc' },
  },
  {
    value: 'updated-desc',
    label: 'Last updated: newest first',
    sort: { key: 'updated', direction: 'desc' },
  },
  {
    value: 'updated-asc',
    label: 'Last updated: oldest first',
    sort: { key: 'updated', direction: 'asc' },
  },
];

export const DEFAULT_GIFT_SORT_VALUE = 'recipient-asc';

export function giftSortForValue(value: string): GiftSort {
  return GIFT_SORT_OPTIONS.find((option) => option.value === value)?.sort ?? DEFAULT_GIFT_SORT;
}
