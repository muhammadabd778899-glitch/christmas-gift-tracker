import { describe, expect, it } from 'vitest';
import { makeGift } from '../../test/fixtures';
import { giftProgress, giftStatus, giftStatusLabel, deliveryMethodLabel } from './gifts';

describe('giftStatus', () => {
  it('returns not_started when all flags are false', () => {
    expect(giftStatus(makeGift({ bought: false, wrapped: false, sent: false }))).toBe(
      'not_started',
    );
  });

  it('returns bought when only bought is true', () => {
    expect(giftStatus(makeGift({ bought: true, wrapped: false, sent: false }))).toBe('bought');
  });

  it('returns wrapped when bought and wrapped are true', () => {
    expect(giftStatus(makeGift({ bought: true, wrapped: true, sent: false }))).toBe('wrapped');
  });

  it('returns sent when all three flags are true', () => {
    expect(giftStatus(makeGift({ bought: true, wrapped: true, sent: true }))).toBe('sent');
  });

  it('returns sent when bought and sent are true (unwrapped direct ship)', () => {
    expect(giftStatus(makeGift({ bought: true, wrapped: false, sent: true }))).toBe('sent');
  });
});

describe('giftStatusLabel', () => {
  it('returns correct labels for each status', () => {
    expect(giftStatusLabel(makeGift({ bought: false, wrapped: false, sent: false }))).toBe(
      'Not started',
    );
    expect(giftStatusLabel(makeGift({ bought: true, wrapped: false, sent: false }))).toBe('Bought');
    expect(giftStatusLabel(makeGift({ bought: true, wrapped: true, sent: false }))).toBe('Wrapped');
    expect(giftStatusLabel(makeGift({ bought: true, wrapped: true, sent: true }))).toBe('Sent');
  });
});

describe('giftProgress', () => {
  it('returns all zeros for an empty list', () => {
    expect(giftProgress([])).toEqual({ total: 0, bought: 0, wrapped: 0, sent: 0 });
  });

  it('counts a single not-started gift', () => {
    expect(giftProgress([makeGift()])).toEqual({ total: 1, bought: 0, wrapped: 0, sent: 0 });
  });

  it('counts bought correctly without affecting wrapped or sent', () => {
    const gifts = [
      makeGift({ bought: true }),
      makeGift({ bought: false }),
      makeGift({ bought: true }),
    ];
    expect(giftProgress(gifts)).toEqual({ total: 3, bought: 2, wrapped: 0, sent: 0 });
  });

  it('counts wrapped and sent independently', () => {
    const gifts = [
      makeGift({ bought: true, wrapped: true, sent: true }),
      makeGift({ bought: true, wrapped: true, sent: false }),
      makeGift({ bought: true, wrapped: false, sent: false }),
      makeGift({ bought: false, wrapped: false, sent: false }),
    ];
    expect(giftProgress(gifts)).toEqual({ total: 4, bought: 3, wrapped: 2, sent: 1 });
  });

  it('handles all gifts at maximum status', () => {
    const gifts = [
      makeGift({ bought: true, wrapped: true, sent: true }),
      makeGift({ bought: true, wrapped: true, sent: true }),
    ];
    expect(giftProgress(gifts)).toEqual({ total: 2, bought: 2, wrapped: 2, sent: 2 });
  });

  it('counts retailer-direct gifts (bought+sent, not wrapped)', () => {
    const gift = makeGift({ bought: true, wrapped: false, sent: true });
    expect(giftProgress([gift])).toEqual({ total: 1, bought: 1, wrapped: 0, sent: 1 });
  });
});

describe('deliveryMethodLabel', () => {
  it('returns correct labels for all known methods', () => {
    expect(deliveryMethodLabel('hand_delivered')).toBe('Hand delivered');
    expect(deliveryMethodLabel('shipped')).toBe('Shipped');
    expect(deliveryMethodLabel('digital')).toBe('Digital');
    expect(deliveryMethodLabel('retailer_direct')).toBe('Retailer direct');
    expect(deliveryMethodLabel('other')).toBe('Other');
  });

  it('returns em-dash for null', () => {
    expect(deliveryMethodLabel(null)).toBe('—');
  });
});
