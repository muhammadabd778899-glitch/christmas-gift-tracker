import type {
  AppSettings,
  DeliveryMethod,
  Gift,
  Idea,
  Recipient,
  Season,
} from '../domain/entities';
import { ExportError } from '../domain/errors';
import { withStorageErrors } from './errors';
import type { RepositoryContext } from './repositories/context';

export type CsvScope = 'active' | 'all';

export interface CsvExportOptions {
  scope: CsvScope;
  includeSensitive: boolean;
}

export interface CsvExport {
  filename: string;
  content: string;
  rowCount: number;
  seasonCount: number;
  scope: CsvScope;
  includeSensitive: boolean;
}

export interface CsvData {
  settings: AppSettings;
  seasons: Season[];
  recipients: Recipient[];
  gifts: Gift[];
  ideas: Idea[];
}

const BASE_HEADERS = [
  'Season',
  'Recipient',
  'Relationship',
  'Gift',
  'Category',
  'Store',
  'Purchase URL',
  'Planned Budget',
  'Actual Cost',
  'Bought',
  'Bought Date',
  'Wrapped',
  'Wrapped Date',
  'Sent',
  'Sent Date',
  'Delivery Method',
  'Source',
] as const;

const SENSITIVE_HEADERS = ['Address', 'Notes'] as const;

const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  hand_delivered: 'Hand delivered',
  shipped: 'Shipped',
  digital: 'Digital',
  retailer_direct: 'Retailer direct',
  other: 'Other',
};

function decimalFromMinor(value: number, fractionDigits: number): string {
  if (fractionDigits === 0) {
    return String(value);
  }

  const factor = 10 ** fractionDigits;
  const whole = Math.floor(value / factor);
  const fraction = String(value % factor).padStart(fractionDigits, '0');

  return `${whole}.${fraction}`;
}

function guardFormula(value: string): string {
  return /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
}

export function escapeCsvField(value: string): string {
  const guarded = guardFormula(value);

  if (/[",\r\n]/.test(guarded)) {
    return `"${guarded.replaceAll('"', '""')}"`;
  }

  return guarded;
}

function joinRow(fields: readonly string[]): string {
  return fields.map(escapeCsvField).join(',');
}

function booleanLabel(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function sortByName<T extends { name: string; id: string }>(items: readonly T[]): T[] {
  return [...items].sort(
    (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );
}

function buildRows(
  data: CsvData,
  options: CsvExportOptions,
): {
  rows: string[][];
  seasons: Season[];
} {
  const active = data.seasons.find((season) => season.status === 'active') ?? null;
  const seasons =
    options.scope === 'active'
      ? active
        ? [active]
        : []
      : [...data.seasons].sort(
          (left, right) =>
            left.holidayDate.localeCompare(right.holidayDate) ||
            left.name.localeCompare(right.name) ||
            left.id.localeCompare(right.id),
        );

  if (options.scope === 'active' && !active) {
    throw new ExportError(
      'There is no active season to export. Create or restore a season, or export all seasons.',
    );
  }

  const rows: string[][] = [];
  const seasonIds = new Set(seasons.map((season) => season.id));
  const recipientsBySeason = new Map<string, Recipient[]>();

  for (const recipient of data.recipients) {
    if (!seasonIds.has(recipient.seasonId)) {
      continue;
    }
    const existing = recipientsBySeason.get(recipient.seasonId) ?? [];
    existing.push(recipient);
    recipientsBySeason.set(recipient.seasonId, existing);
  }

  const giftsByRecipient = new Map<string, Gift[]>();
  for (const gift of data.gifts) {
    if (!seasonIds.has(gift.seasonId)) {
      continue;
    }
    const existing = giftsByRecipient.get(gift.recipientId) ?? [];
    existing.push(gift);
    giftsByRecipient.set(gift.recipientId, existing);
  }

  for (const season of seasons) {
    const recipients = sortByName(recipientsBySeason.get(season.id) ?? []);

    for (const recipient of recipients) {
      const gifts = sortByName(giftsByRecipient.get(recipient.id) ?? []);

      for (const gift of gifts) {
        const row = [
          season.name,
          recipient.name,
          recipient.relationship ?? '',
          gift.name,
          gift.category ?? '',
          gift.store ?? '',
          gift.purchaseUrl ?? '',
          gift.plannedBudgetMinor === null
            ? ''
            : decimalFromMinor(gift.plannedBudgetMinor, data.settings.fractionDigits),
          gift.actualCostMinor === null
            ? ''
            : decimalFromMinor(gift.actualCostMinor, data.settings.fractionDigits),
          booleanLabel(gift.bought),
          gift.boughtOn ?? '',
          booleanLabel(gift.wrapped),
          gift.wrappedOn ?? '',
          booleanLabel(gift.sent),
          gift.sentOn ?? '',
          gift.deliveryMethod === null ? '' : DELIVERY_LABELS[gift.deliveryMethod],
          gift.sourceIdeaId === undefined ? '' : 'Idea',
        ];

        if (options.includeSensitive) {
          row.push(gift.address ?? '', gift.notes ?? '');
        }

        rows.push(row);
      }
    }
  }

  return { rows, seasons };
}

export function buildCsv(
  data: CsvData,
  options: CsvExportOptions,
): { content: string; rowCount: number; seasonCount: number } {
  const { rows, seasons } = buildRows(data, options);
  const headers = options.includeSensitive
    ? [...BASE_HEADERS, ...SENSITIVE_HEADERS]
    : [...BASE_HEADERS];
  const lines = [joinRow(headers), ...rows.map(joinRow)];

  return {
    content: `\uFEFF${lines.join('\r\n')}\r\n`,
    rowCount: rows.length,
    seasonCount: seasons.length,
  };
}

export async function exportCsv(
  context: RepositoryContext,
  options: CsvExportOptions,
): Promise<CsvExport> {
  return withStorageErrors(async () => {
    const [settings, seasons, recipients, gifts, ideas] = await Promise.all([
      context.db.settings.get('app'),
      context.db.seasons.toArray(),
      context.db.recipients.toArray(),
      context.db.gifts.toArray(),
      context.db.ideas.toArray(),
    ]);

    if (!settings) {
      throw new ExportError('The app settings are missing, so a CSV was not made.');
    }

    const built = buildCsv(
      { settings, seasons, recipients, gifts, ideas },
      { scope: options.scope, includeSensitive: options.includeSensitive },
    );

    return {
      filename: `christmas-gift-tracker-gifts-${context.nowIso().slice(0, 10)}.csv`,
      content: built.content,
      rowCount: built.rowCount,
      seasonCount: built.seasonCount,
      scope: options.scope,
      includeSensitive: options.includeSensitive,
    };
  });
}
