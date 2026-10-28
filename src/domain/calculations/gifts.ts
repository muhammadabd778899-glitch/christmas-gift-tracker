import type { Gift } from '../entities';

export type GiftStatus = 'not_started' | 'bought' | 'wrapped' | 'sent';

export interface GiftProgress {
  total: number;
  bought: number;
  wrapped: number;
  sent: number;
}

/**
 * Derive the most advanced status of a gift for display purposes.
 * The canonical "most done" state wins: sent > wrapped > bought > not_started.
 */
export function giftStatus(gift: Pick<Gift, 'bought' | 'wrapped' | 'sent'>): GiftStatus {
  if (gift.sent) return 'sent';
  if (gift.wrapped) return 'wrapped';
  if (gift.bought) return 'bought';
  return 'not_started';
}

export function giftStatusLabel(gift: Pick<Gift, 'bought' | 'wrapped' | 'sent'>): string {
  switch (giftStatus(gift)) {
    case 'sent':
      return 'Sent';
    case 'wrapped':
      return 'Wrapped';
    case 'bought':
      return 'Bought';
    default:
      return 'Not started';
  }
}

/**
 * Count bought / wrapped / sent across a list of gifts.
 * Returns zeros for an empty list — no division-by-zero risk.
 */
export function giftProgress(gifts: readonly Gift[]): GiftProgress {
  let bought = 0;
  let wrapped = 0;
  let sent = 0;

  for (const gift of gifts) {
    if (gift.bought) bought++;
    if (gift.wrapped) wrapped++;
    if (gift.sent) sent++;
  }

  return { total: gifts.length, bought, wrapped, sent };
}

/**
 * Human-readable label for the delivery method enum value.
 */
export function deliveryMethodLabel(method: Gift['deliveryMethod']): string {
  switch (method) {
    case 'hand_delivered':
      return 'Hand delivered';
    case 'shipped':
      return 'Shipped';
    case 'digital':
      return 'Digital';
    case 'retailer_direct':
      return 'Retailer direct';
    case 'other':
      return 'Other';
    default:
      return '—';
  }
}
