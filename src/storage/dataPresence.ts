import type { GiftTrackerDatabase } from './db';

export async function hasStoredMonetaryData(db: GiftTrackerDatabase): Promise<boolean> {
  const [seasonBudgets, recipientCaps, giftCosts, ideaEstimates] = await Promise.all([
    db.seasons.filter((season) => season.budgetMinor !== null).count(),
    db.recipients.filter((recipient) => recipient.budgetCapMinor !== null).count(),
    db.gifts
      .filter((gift) => gift.plannedBudgetMinor !== null || gift.actualCostMinor !== null)
      .count(),
    db.ideas.filter((idea) => idea.estimatedPriceMinor !== null).count(),
  ]);

  return seasonBudgets + recipientCaps + giftCosts + ideaEstimates > 0;
}
