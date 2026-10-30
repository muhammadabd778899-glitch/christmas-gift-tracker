import type { Gift, MinorUnits, Recipient, RecipientId } from '../entities';

export interface RecipientMetrics {
  capMinor: MinorUnits | null;
  plannedMinor: MinorUnits;
  spentMinor: MinorUnits;
  remainingCapMinor: MinorUnits | null;
  capExceededByMinor: MinorUnits | null;
  utilization: number | null;
  overCap: boolean;
  giftCount: number;
  boughtGiftCount: number;
}

function sumMinor(values: MinorUnits[]): MinorUnits {
  return values.reduce((total, value) => total + value, 0);
}

export function calculateRecipientMetrics(
  recipient: Pick<Recipient, 'id' | 'budgetCapMinor'>,
  seasonGifts: readonly Gift[],
): RecipientMetrics {
  const gifts = seasonGifts.filter((gift) => gift.recipientId === recipient.id);
  const plannedMinor = sumMinor(
    gifts
      .map((gift) => gift.plannedBudgetMinor)
      .filter((value): value is MinorUnits => value !== null),
  );
  const boughtGifts = gifts.filter((gift) => gift.bought);
  const spentMinor = sumMinor(
    boughtGifts
      .map((gift) => gift.actualCostMinor)
      .filter((value): value is MinorUnits => value !== null),
  );
  const capMinor = recipient.budgetCapMinor;
  const remainingCapMinor = capMinor === null ? null : capMinor - spentMinor;
  const capExceededByMinor = capMinor === null ? null : Math.max(0, spentMinor - capMinor);
  const utilization = capMinor === null || capMinor === 0 ? null : spentMinor / capMinor;

  return {
    capMinor,
    plannedMinor,
    spentMinor,
    remainingCapMinor,
    capExceededByMinor,
    utilization,
    overCap: capMinor !== null && spentMinor > capMinor,
    giftCount: gifts.length,
    boughtGiftCount: boughtGifts.length,
  };
}

export interface RecipientDetail {
  recipient: Recipient;
  gifts: Gift[];
  metrics: RecipientMetrics;
}

export function buildRecipientDetail(
  recipient: Recipient,
  seasonGifts: readonly Gift[],
): RecipientDetail {
  return {
    recipient,
    gifts: seasonGifts.filter((gift) => gift.recipientId === recipient.id),
    metrics: calculateRecipientMetrics(recipient, seasonGifts),
  };
}

export function calculateRecipientMetricsById(
  recipients: readonly Recipient[],
  seasonGifts: readonly Gift[],
): Map<RecipientId, RecipientMetrics> {
  return new Map(
    recipients.map((recipient) => [
      recipient.id,
      calculateRecipientMetrics(recipient, seasonGifts),
    ]),
  );
}
