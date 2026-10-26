import { describe, expect, it } from 'vitest';
import { calculateRecipientMetrics } from './recipients';
import type { Gift } from '../entities';
import { FIXED_IDS, makeGift, makeRecipient } from '../../test/fixtures';

describe('recipient metrics', () => {
  it('returns honest zeroes when a recipient has no gifts', () => {
    const metrics = calculateRecipientMetrics(makeRecipient({ budgetCapMinor: 15000 }), []);

    expect(metrics.plannedMinor).toBe(0);
    expect(metrics.spentMinor).toBe(0);
    expect(metrics.remainingCapMinor).toBe(15000);
    expect(metrics.capExceededByMinor).toBe(0);
    expect(metrics.utilization).toBe(0);
    expect(metrics.overCap).toBe(false);
    expect(metrics.giftCount).toBe(0);
    expect(metrics.boughtGiftCount).toBe(0);
  });

  it('uses planned budgets from all gifts and actual cost only from bought gifts', () => {
    const recipient = makeRecipient({ budgetCapMinor: 10000 });
    const metrics = calculateRecipientMetrics(recipient, [
      makeGift({ plannedBudgetMinor: 2500, actualCostMinor: 2400, bought: true }),
      makeGift({
        id: FIXED_IDS.giftFromIdea as Gift['id'],
        plannedBudgetMinor: 4000,
        actualCostMinor: 3900,
        bought: false,
      }),
    ]);

    expect(metrics.plannedMinor).toBe(6500);
    expect(metrics.spentMinor).toBe(2400);
    expect(metrics.remainingCapMinor).toBe(7600);
    expect(metrics.utilization).toBe(0.24);
    expect(metrics.overCap).toBe(false);
    expect(metrics.giftCount).toBe(2);
    expect(metrics.boughtGiftCount).toBe(1);
  });

  it('does not count a bought gift without an actual cost as spending', () => {
    const metrics = calculateRecipientMetrics(makeRecipient({ budgetCapMinor: 10000 }), [
      makeGift({ plannedBudgetMinor: 2500, actualCostMinor: null, bought: true }),
    ]);

    expect(metrics.plannedMinor).toBe(2500);
    expect(metrics.spentMinor).toBe(0);
    expect(metrics.remainingCapMinor).toBe(10000);
    expect(metrics.boughtGiftCount).toBe(1);
  });

  it('reports over-cap spending and negative remaining cap', () => {
    const metrics = calculateRecipientMetrics(makeRecipient({ budgetCapMinor: 2000 }), [
      makeGift({ plannedBudgetMinor: 2500, actualCostMinor: 2400, bought: true }),
    ]);

    expect(metrics.spentMinor).toBe(2400);
    expect(metrics.remainingCapMinor).toBe(-400);
    expect(metrics.capExceededByMinor).toBe(400);
    expect(metrics.utilization).toBe(1.2);
    expect(metrics.overCap).toBe(true);
  });

  it('treats a zero cap differently from no cap', () => {
    const zeroCap = calculateRecipientMetrics(makeRecipient({ budgetCapMinor: 0 }), []);
    const noCap = calculateRecipientMetrics(makeRecipient({ budgetCapMinor: null }), []);

    expect(zeroCap.capMinor).toBe(0);
    expect(zeroCap.remainingCapMinor).toBe(0);
    expect(zeroCap.utilization).toBeNull();
    expect(zeroCap.overCap).toBe(false);

    expect(noCap.capMinor).toBeNull();
    expect(noCap.remainingCapMinor).toBeNull();
    expect(noCap.capExceededByMinor).toBeNull();
    expect(noCap.utilization).toBeNull();
    expect(noCap.overCap).toBe(false);
  });

  it('does not attribute another recipient’s gifts', () => {
    const metrics = calculateRecipientMetrics(makeRecipient({ budgetCapMinor: 10000 }), [
      makeGift({
        recipientId: FIXED_IDS.otherRecipient as Gift['recipientId'],
        plannedBudgetMinor: 9000,
      }),
    ]);

    expect(metrics.plannedMinor).toBe(0);
    expect(metrics.giftCount).toBe(0);
  });
});
