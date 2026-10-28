import type { DateOnly, Gift, MinorUnits, Recipient, RecipientId, Season } from '../entities';
import { calendarDayDifference } from '../dates';
import { giftProgress, type GiftProgress } from './gifts';
import { calculateRecipientMetrics } from './recipients';

export interface SeasonTotals {
  budgetMinor: MinorUnits | null;
  plannedTotalMinor: MinorUnits;
  actualSpentMinor: MinorUnits;
  remainingMinor: MinorUnits | null;
  unallocatedMinor: MinorUnits | null;
  plannedOverBudget: boolean;
  spentOverBudget: boolean;
  plannedOverBudgetMinor: MinorUnits | null;
  spentOverBudgetMinor: MinorUnits | null;
  boughtWithoutCostCount: number;
  unbudgetedGiftCount: number;
}

export interface ProgressSummary extends GiftProgress {
  boughtRatio: number | null;
  wrappedRatio: number | null;
  sentRatio: number | null;
}

export interface RecipientChartDatum {
  recipientId: RecipientId;
  name: string;
  plannedMinor: MinorUnits;
  actualMinor: MinorUnits;
}

export type DashboardFinding =
  | { kind: 'spent_over_budget'; severity: 'critical'; amountMinor: MinorUnits }
  | { kind: 'bought_without_cost'; severity: 'warning'; count: number }
  | {
      kind: 'recipient_over_cap';
      severity: 'warning';
      recipients: Array<{
        recipientId: RecipientId;
        name: string;
        exceededByMinor: MinorUnits;
      }>;
    }
  | { kind: 'planned_over_budget'; severity: 'warning'; amountMinor: MinorUnits }
  | { kind: 'unbudgeted_gifts'; severity: 'info'; count: number };

export type Countdown =
  { state: 'future'; days: number } | { state: 'today' } | { state: 'past'; days: number };

export interface DashboardModel {
  totals: SeasonTotals;
  progress: ProgressSummary;
  chart: RecipientChartDatum[];
  findings: DashboardFinding[];
}

function sumMinor(values: readonly MinorUnits[]): MinorUnits {
  return values.reduce((total, value) => total + value, 0);
}

function giftsInSeason(season: Pick<Season, 'id'>, gifts: readonly Gift[]): Gift[] {
  return gifts.filter((gift) => gift.seasonId === season.id);
}

export function calculateSeasonTotals(
  season: Pick<Season, 'id' | 'budgetMinor'>,
  gifts: readonly Gift[],
): SeasonTotals {
  const seasonGifts = giftsInSeason(season, gifts);
  const plannedTotalMinor = sumMinor(
    seasonGifts
      .map((gift) => gift.plannedBudgetMinor)
      .filter((value): value is MinorUnits => value !== null),
  );
  const actualSpentMinor = sumMinor(
    seasonGifts
      .filter((gift) => gift.bought)
      .map((gift) => gift.actualCostMinor)
      .filter((value): value is MinorUnits => value !== null),
  );
  const budgetMinor = season.budgetMinor;
  const remainingMinor = budgetMinor === null ? null : budgetMinor - actualSpentMinor;
  const unallocatedMinor = budgetMinor === null ? null : budgetMinor - plannedTotalMinor;

  return {
    budgetMinor,
    plannedTotalMinor,
    actualSpentMinor,
    remainingMinor,
    unallocatedMinor,
    plannedOverBudget: budgetMinor !== null && plannedTotalMinor > budgetMinor,
    spentOverBudget: budgetMinor !== null && actualSpentMinor > budgetMinor,
    plannedOverBudgetMinor:
      budgetMinor === null ? null : Math.max(0, plannedTotalMinor - budgetMinor),
    spentOverBudgetMinor: budgetMinor === null ? null : Math.max(0, actualSpentMinor - budgetMinor),
    boughtWithoutCostCount: seasonGifts.filter(
      (gift) => gift.bought && gift.actualCostMinor === null,
    ).length,
    unbudgetedGiftCount: seasonGifts.filter((gift) => gift.plannedBudgetMinor === null).length,
  };
}

export function calculateProgress(gifts: readonly Gift[]): ProgressSummary {
  const progress = giftProgress(gifts);

  return {
    ...progress,
    boughtRatio: progress.total === 0 ? null : progress.bought / progress.total,
    wrappedRatio: progress.total === 0 ? null : progress.wrapped / progress.total,
    sentRatio: progress.total === 0 ? null : progress.sent / progress.total,
  };
}

export function buildBudgetActualSeries(
  recipients: readonly Recipient[],
  gifts: readonly Gift[],
): RecipientChartDatum[] {
  return recipients
    .map((recipient) => {
      const metrics = calculateRecipientMetrics(recipient, gifts);

      return {
        recipient,
        metrics,
      };
    })
    .filter(({ metrics }) => metrics.giftCount > 0 || metrics.capMinor !== null)
    .map(({ recipient, metrics }) => ({
      recipientId: recipient.id,
      name: recipient.name,
      plannedMinor: metrics.plannedMinor,
      actualMinor: metrics.spentMinor,
    }))
    .sort(
      (left, right) =>
        right.plannedMinor - left.plannedMinor ||
        left.name.localeCompare(right.name) ||
        left.recipientId.localeCompare(right.recipientId),
    );
}

export function calculateCountdown(holidayDate: DateOnly, today: DateOnly): Countdown {
  const dayDelta = calendarDayDifference(today, holidayDate);

  if (dayDelta > 0) {
    return { state: 'future', days: dayDelta };
  }

  if (dayDelta === 0) {
    return { state: 'today' };
  }

  return { state: 'past', days: Math.abs(dayDelta) };
}

export function buildDashboardFindings(
  season: Pick<Season, 'id' | 'budgetMinor'>,
  gifts: readonly Gift[],
  recipients: readonly Recipient[],
): DashboardFinding[] {
  const totals = calculateSeasonTotals(season, gifts);
  const findings: DashboardFinding[] = [];

  // These follow the severity order documented in DATA_MODEL §7.3.
  if (totals.spentOverBudget) {
    findings.push({
      kind: 'spent_over_budget',
      severity: 'critical',
      amountMinor: totals.spentOverBudgetMinor ?? 0,
    });
  }

  if (totals.boughtWithoutCostCount > 0) {
    findings.push({
      kind: 'bought_without_cost',
      severity: 'warning',
      count: totals.boughtWithoutCostCount,
    });
  }

  const overCapRecipients = recipients
    .map((recipient) => ({
      recipient,
      metrics: calculateRecipientMetrics(recipient, gifts),
    }))
    .filter(({ metrics }) => metrics.overCap && metrics.capExceededByMinor !== null)
    .map(({ recipient, metrics }) => ({
      recipientId: recipient.id,
      name: recipient.name,
      exceededByMinor: metrics.capExceededByMinor ?? 0,
    }));

  if (overCapRecipients.length > 0) {
    findings.push({
      kind: 'recipient_over_cap',
      severity: 'warning',
      recipients: overCapRecipients,
    });
  }

  if (totals.plannedOverBudget) {
    findings.push({
      kind: 'planned_over_budget',
      severity: 'warning',
      amountMinor: totals.plannedOverBudgetMinor ?? 0,
    });
  }

  if (totals.unbudgetedGiftCount > 0) {
    findings.push({
      kind: 'unbudgeted_gifts',
      severity: 'info',
      count: totals.unbudgetedGiftCount,
    });
  }

  return findings;
}

export function buildDashboardModel(
  season: Pick<Season, 'id' | 'budgetMinor'>,
  gifts: readonly Gift[],
  recipients: readonly Recipient[],
): DashboardModel {
  const seasonGifts = giftsInSeason(season, gifts);

  return {
    totals: calculateSeasonTotals(season, seasonGifts),
    progress: calculateProgress(seasonGifts),
    chart: buildBudgetActualSeries(recipients, seasonGifts),
    findings: buildDashboardFindings(season, seasonGifts, recipients),
  };
}

export function formatRatioPercent(ratio: number | null): string {
  if (ratio === null) {
    return '—';
  }

  const percent = ratio * 100;

  if (percent > 999) {
    return '999%+';
  }

  return `${Math.round(percent)}%`;
}
