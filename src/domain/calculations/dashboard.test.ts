import { describe, expect, it } from 'vitest';
import type { Gift, Recipient } from '../entities';
import { FIXED_IDS, makeGift, makeRecipient, makeSeason } from '../../test/fixtures';
import {
  buildBudgetActualSeries,
  buildDashboardFindings,
  buildDashboardModel,
  calculateCountdown,
  calculateProgress,
  calculateSeasonTotals,
  formatRatioPercent,
} from './dashboard';

function giftWithId(id: string, overrides: Partial<Gift> = {}): Gift {
  return makeGift({ id: id as Gift['id'], ...overrides });
}

describe('calculateSeasonTotals', () => {
  it('returns null budget-derived values and honest zeroes for an empty season', () => {
    const totals = calculateSeasonTotals(makeSeason({ budgetMinor: null }), []);

    expect(totals).toEqual({
      budgetMinor: null,
      plannedTotalMinor: 0,
      actualSpentMinor: 0,
      remainingMinor: null,
      unallocatedMinor: null,
      plannedOverBudget: false,
      spentOverBudget: false,
      plannedOverBudgetMinor: null,
      spentOverBudgetMinor: null,
      boughtWithoutCostCount: 0,
      unbudgetedGiftCount: 0,
    });
  });

  it('distinguishes zero money from missing money', () => {
    const totals = calculateSeasonTotals(makeSeason({ budgetMinor: 0 }), [
      makeGift({ plannedBudgetMinor: null, actualCostMinor: null }),
      giftWithId('33333333-3333-4333-8333-333333333334', {
        plannedBudgetMinor: 0,
        actualCostMinor: 0,
        bought: true,
      }),
      giftWithId('33333333-3333-4333-8333-333333333335', {
        plannedBudgetMinor: 2500,
      }),
    ]);

    expect(totals.plannedTotalMinor).toBe(2500);
    expect(totals.actualSpentMinor).toBe(0);
    expect(totals.remainingMinor).toBe(0);
    expect(totals.unallocatedMinor).toBe(-2500);
    expect(totals.plannedOverBudget).toBe(true);
    expect(totals.spentOverBudget).toBe(false);
    expect(totals.unbudgetedGiftCount).toBe(1);
  });

  it('counts actual costs only for bought gifts with recorded costs', () => {
    const totals = calculateSeasonTotals(makeSeason({ budgetMinor: 10000 }), [
      giftWithId('33333333-3333-4333-8333-333333333334', {
        bought: true,
        actualCostMinor: 2400,
      }),
      giftWithId('33333333-3333-4333-8333-333333333335', {
        bought: true,
        actualCostMinor: null,
      }),
      giftWithId('33333333-3333-4333-8333-333333333336', {
        bought: false,
        actualCostMinor: 9900,
      }),
    ]);

    expect(totals.actualSpentMinor).toBe(2400);
    expect(totals.boughtWithoutCostCount).toBe(1);
  });

  it('keeps negative remaining and unallocated values instead of clamping them', () => {
    const totals = calculateSeasonTotals(makeSeason({ budgetMinor: 1000 }), [
      makeGift({ plannedBudgetMinor: 1200, actualCostMinor: 1500, bought: true }),
    ]);

    expect(totals.remainingMinor).toBe(-500);
    expect(totals.unallocatedMinor).toBe(-200);
    expect(totals.spentOverBudget).toBe(true);
    expect(totals.spentOverBudgetMinor).toBe(500);
    expect(totals.plannedOverBudget).toBe(true);
    expect(totals.plannedOverBudgetMinor).toBe(200);
  });

  it('ignores gifts from another season', () => {
    const totals = calculateSeasonTotals(makeSeason(), [
      makeGift({ plannedBudgetMinor: 2500, actualCostMinor: 2000, bought: true }),
      giftWithId('33333333-3333-4333-8333-333333333337', {
        seasonId: FIXED_IDS.otherSeason as Gift['seasonId'],
        plannedBudgetMinor: 900000,
        actualCostMinor: 900000,
        bought: true,
      }),
    ]);

    expect(totals.plannedTotalMinor).toBe(2500);
    expect(totals.actualSpentMinor).toBe(2000);
  });
});

describe('calculateProgress', () => {
  it('returns null ratios for an empty gift list', () => {
    expect(calculateProgress([])).toEqual({
      total: 0,
      bought: 0,
      wrapped: 0,
      sent: 0,
      boughtRatio: null,
      wrappedRatio: null,
      sentRatio: null,
    });
  });

  it('counts overlapping statuses and returns their ratios', () => {
    const progress = calculateProgress([
      makeGift({ bought: true, wrapped: true, sent: true }),
      giftWithId('33333333-3333-4333-8333-333333333338', {
        bought: true,
        wrapped: false,
        sent: false,
      }),
      giftWithId('33333333-3333-4333-8333-333333333339', {
        bought: false,
        wrapped: false,
        sent: false,
      }),
    ]);

    expect(progress.bought).toBe(2);
    expect(progress.wrapped).toBe(1);
    expect(progress.sent).toBe(1);
    expect(progress.boughtRatio).toBeCloseTo(2 / 3);
    expect(progress.wrappedRatio).toBeCloseTo(1 / 3);
    expect(progress.sentRatio).toBeCloseTo(1 / 3);
  });
});

describe('buildBudgetActualSeries', () => {
  it('includes recipients with gifts or caps and sorts by planned, name, then id', () => {
    const recipients: Recipient[] = [
      makeRecipient({ id: '22222222-2222-4222-8222-222222222222' as Recipient['id'], name: 'Zoe' }),
      makeRecipient({
        id: FIXED_IDS.otherRecipient as Recipient['id'],
        name: 'Alex',
        budgetCapMinor: 10000,
      }),
      makeRecipient({
        id: '22222222-2222-4222-8222-333333333334' as Recipient['id'],
        name: 'Blair',
        budgetCapMinor: null,
      }),
      makeRecipient({
        id: '22222222-2222-4222-8222-333333333335' as Recipient['id'],
        name: 'Casey',
        budgetCapMinor: 5000,
      }),
    ];
    const gifts: Gift[] = [
      giftWithId('33333333-3333-4333-8333-333333333340', {
        recipientId: recipients[0]!.id,
        plannedBudgetMinor: 3000,
        actualCostMinor: 2800,
        bought: true,
      }),
      giftWithId('33333333-3333-4333-8333-333333333341', {
        recipientId: recipients[1]!.id,
        plannedBudgetMinor: 3000,
        actualCostMinor: 3100,
        bought: true,
      }),
      giftWithId('33333333-3333-4333-8333-333333333342', {
        recipientId: recipients[1]!.id,
        plannedBudgetMinor: 1000,
        actualCostMinor: null,
        bought: false,
      }),
    ];

    expect(buildBudgetActualSeries(recipients, gifts)).toEqual([
      {
        recipientId: recipients[1]!.id,
        name: 'Alex',
        plannedMinor: 4000,
        actualMinor: 3100,
      },
      {
        recipientId: recipients[0]!.id,
        name: 'Zoe',
        plannedMinor: 3000,
        actualMinor: 2800,
      },
      {
        recipientId: recipients[3]!.id,
        name: 'Casey',
        plannedMinor: 0,
        actualMinor: 0,
      },
    ]);
  });

  it('omits recipients with neither a gift nor a cap', () => {
    const included = makeRecipient({ budgetCapMinor: 10000 });
    const excluded = makeRecipient({
      id: FIXED_IDS.otherRecipient as Recipient['id'],
      budgetCapMinor: null,
    });

    expect(buildBudgetActualSeries([included, excluded], [])).toEqual([
      {
        recipientId: included.id,
        name: included.name,
        plannedMinor: 0,
        actualMinor: 0,
      },
    ]);
  });
});

describe('calculateCountdown', () => {
  it('handles a future date', () => {
    expect(calculateCountdown('2026-12-25', '2026-10-26')).toEqual({
      state: 'future',
      days: 60,
    });
  });

  it('handles the holiday itself', () => {
    expect(calculateCountdown('2026-12-25', '2026-12-25')).toEqual({ state: 'today' });
  });

  it('handles a past date', () => {
    expect(calculateCountdown('2026-12-25', '2026-12-26')).toEqual({
      state: 'past',
      days: 1,
    });
  });

  it('handles year boundaries', () => {
    expect(calculateCountdown('2027-01-01', '2026-12-31')).toEqual({
      state: 'future',
      days: 1,
    });
  });

  it('uses calendar days across daylight-saving transitions', () => {
    expect(calculateCountdown('2027-03-15', '2027-03-13')).toEqual({
      state: 'future',
      days: 2,
    });
    expect(calculateCountdown('2026-11-02', '2026-10-31')).toEqual({
      state: 'future',
      days: 2,
    });
  });
});

describe('buildDashboardFindings', () => {
  it('orders overspend, missing costs, over-cap recipients, planned overspend, and unbudgeted gifts', () => {
    const season = makeSeason({ budgetMinor: 10000 });
    const recipients = [
      makeRecipient({
        id: FIXED_IDS.recipient as Recipient['id'],
        name: 'Alex',
        budgetCapMinor: 1000,
      }),
      makeRecipient({
        id: FIXED_IDS.otherRecipient as Recipient['id'],
        name: 'Blair',
        budgetCapMinor: 0,
      }),
    ];
    const gifts = [
      giftWithId('33333333-3333-4333-8333-333333333343', {
        recipientId: recipients[0]!.id,
        plannedBudgetMinor: 12000,
        actualCostMinor: 11000,
        bought: true,
      }),
      giftWithId('33333333-3333-4333-8333-333333333344', {
        recipientId: recipients[1]!.id,
        plannedBudgetMinor: null,
        actualCostMinor: 500,
        bought: true,
      }),
    ];

    expect(buildDashboardFindings(season, gifts, recipients)).toEqual([
      { kind: 'spent_over_budget', severity: 'critical', amountMinor: 1500 },
      {
        kind: 'recipient_over_cap',
        severity: 'warning',
        recipients: [
          { recipientId: recipients[0]!.id, name: 'Alex', exceededByMinor: 10000 },
          { recipientId: recipients[1]!.id, name: 'Blair', exceededByMinor: 500 },
        ],
      },
      { kind: 'planned_over_budget', severity: 'warning', amountMinor: 2000 },
      { kind: 'unbudgeted_gifts', severity: 'info', count: 1 },
    ]);
  });

  it('returns no findings when every value is healthy', () => {
    const season = makeSeason({ budgetMinor: 10000 });
    const recipients = [makeRecipient({ budgetCapMinor: 10000 })];
    const gifts = [makeGift({ plannedBudgetMinor: 2500, actualCostMinor: 2400, bought: true })];

    expect(buildDashboardFindings(season, gifts, recipients)).toEqual([]);
  });

  it('reports missing costs and unbudgeted gifts as separate counts', () => {
    const season = makeSeason({ budgetMinor: null });
    const recipients = [makeRecipient({ budgetCapMinor: null })];
    const gifts = [
      makeGift({ plannedBudgetMinor: null, actualCostMinor: null, bought: true }),
      giftWithId('33333333-3333-4333-8333-333333333345', {
        plannedBudgetMinor: null,
        actualCostMinor: 1200,
        bought: true,
      }),
    ];

    expect(buildDashboardFindings(season, gifts, recipients)).toEqual([
      { kind: 'bought_without_cost', severity: 'warning', count: 1 },
      { kind: 'unbudgeted_gifts', severity: 'info', count: 2 },
    ]);
  });

  it('treats a zero cap as exceeded when any money is spent', () => {
    const season = makeSeason({ budgetMinor: null });
    const recipient = makeRecipient({ name: 'Casey', budgetCapMinor: 0 });
    const gifts = [makeGift({ plannedBudgetMinor: null, actualCostMinor: 1, bought: true })];

    expect(buildDashboardFindings(season, gifts, [recipient])).toEqual([
      {
        kind: 'recipient_over_cap',
        severity: 'warning',
        recipients: [{ recipientId: recipient.id, name: 'Casey', exceededByMinor: 1 }],
      },
      { kind: 'unbudgeted_gifts', severity: 'info', count: 1 },
    ]);
  });
});

describe('buildDashboardModel', () => {
  it('keeps archived-season records out of every current-season metric', () => {
    const season = makeSeason({ budgetMinor: 10000 });
    const recipients = [makeRecipient({ budgetCapMinor: 10000 })];
    const gifts = [
      makeGift({ plannedBudgetMinor: 2500, actualCostMinor: 2400, bought: true }),
      giftWithId('33333333-3333-4333-8333-333333333346', {
        seasonId: FIXED_IDS.otherSeason as Gift['seasonId'],
        plannedBudgetMinor: 50000,
        actualCostMinor: 50000,
        bought: true,
      }),
    ];

    const model = buildDashboardModel(season, gifts, recipients);

    expect(model.totals.plannedTotalMinor).toBe(2500);
    expect(model.totals.actualSpentMinor).toBe(2400);
    expect(model.progress.total).toBe(1);
    expect(model.chart).toEqual([
      {
        recipientId: recipients[0]!.id,
        name: recipients[0]!.name,
        plannedMinor: 2500,
        actualMinor: 2400,
      },
    ]);
    expect(model.findings).toEqual([]);
  });
});

describe('formatRatioPercent', () => {
  it('returns a dash for a null ratio, rounded percentages otherwise, and a cap for extreme values', () => {
    expect(formatRatioPercent(null)).toBe('—');
    expect(formatRatioPercent(0)).toBe('0%');
    expect(formatRatioPercent(0.586)).toBe('59%');
    expect(formatRatioPercent(1)).toBe('100%');
    expect(formatRatioPercent(10)).toBe('999%+');
  });
});
