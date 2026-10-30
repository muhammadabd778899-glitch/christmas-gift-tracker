import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DeliveryMethod, Gift, Idea, Recipient, Season } from '../domain/entities';
import { ExportError } from '../domain/errors';
import { buildCsv, type CsvData } from './csv';
import { createTestStorage, type TestStorage } from '../test/storage';
import {
  FIXED_IDS,
  makeGift,
  makeIdea,
  makeRecipient,
  makeSeason,
  makeSettings,
} from '../test/fixtures';

const HEADER =
  'Season,Recipient,Relationship,Gift,Category,Store,Purchase URL,Planned Budget,Actual Cost,Bought,Bought Date,Wrapped,Wrapped Date,Sent,Sent Date,Delivery Method,Source';

function data(overrides: Partial<CsvData> = {}): CsvData {
  const active = makeSeason({ name: 'Christmas, "2026"' });
  const archived = makeSeason({
    id: FIXED_IDS.otherSeason as Season['id'],
    name: 'Christmas 2025',
    holidayDate: '2025-12-25',
    status: 'archived',
    archivedAt: '2026-01-02T00:00:00.000Z',
  });
  const recipient = makeRecipient();
  const archivedRecipient = makeRecipient({
    id: FIXED_IDS.otherRecipient as Recipient['id'],
    seasonId: FIXED_IDS.otherSeason as Recipient['seasonId'],
    name: 'Sam',
    relationship: null,
    notes: null,
  });
  const idea = makeIdea();
  const gift = makeGift({
    name: '=HYPERLINK("https://example.com")',
    category: '  +Games',
    store: '@shop',
    plannedBudgetMinor: 123_456,
    actualCostMinor: 500,
    bought: true,
    boughtOn: '2026-11-01',
    wrapped: true,
    wrappedOn: '2026-12-01',
    sent: true,
    sentOn: '2026-12-02',
    deliveryMethod: 'shipped',
    address: '12 "Elm" Road\nFlat 2',
    notes: '=secret',
    sourceIdeaId: FIXED_IDS.idea as Idea['id'],
  });
  const archivedGift = makeGift({
    id: '33333333-3333-4333-8333-555555555555' as Gift['id'],
    seasonId: FIXED_IDS.otherSeason as Gift['seasonId'],
    recipientId: FIXED_IDS.otherRecipient as Gift['recipientId'],
    name: 'Mug',
    category: null,
    store: null,
    purchaseUrl: null,
    plannedBudgetMinor: null,
    actualCostMinor: null,
    bought: false,
    boughtOn: null,
    wrapped: false,
    wrappedOn: null,
    sent: false,
    sentOn: null,
    deliveryMethod: null,
    address: null,
    notes: null,
  });

  return {
    settings: makeSettings(),
    seasons: [active, archived],
    recipients: [recipient, archivedRecipient],
    gifts: [gift, archivedGift],
    ideas: [idea],
    ...overrides,
  };
}

describe('CSV generation', () => {
  it('writes the documented header, a UTF-8 BOM, and CRLF line endings', () => {
    const result = buildCsv(data(), { scope: 'active', includeSensitive: false });

    expect(result.content.startsWith('\uFEFF')).toBe(true);
    expect(result.content).toContain(`${HEADER}\r\n`);
    expect(result.content.endsWith('\r\n')).toBe(true);
    expect(result.rowCount).toBe(1);
    expect(result.seasonCount).toBe(1);
  });

  it('exports active-season gifts with money, dates, booleans, delivery labels, and idea source', () => {
    const result = buildCsv(data(), { scope: 'active', includeSensitive: false });
    const line = result.content.split('\r\n')[1]!;

    expect(line).toContain('"Christmas, ""2026"""');
    expect(line).toContain('1234.56');
    expect(line).toContain('5.00');
    expect(line).toContain('Yes');
    expect(line).toContain('2026-11-01');
    expect(line).toContain('Shipped');
    expect(line).toContain('Idea');
    expect(line).not.toContain('12 "Elm" Road');
    expect(result.content).not.toContain('=secret');
  });

  it('escapes commas, quotes, and newlines per RFC 4180 and guards formula-like text', () => {
    const result = buildCsv(data(), { scope: 'active', includeSensitive: true });
    const lines = result.content.split('\r\n');
    const row = lines.slice(1, 4).join('\r\n');

    expect(lines[0]).toContain(',Address,Notes');
    expect(row).toContain('"\'=HYPERLINK(""https://example.com"")"');
    expect(row).toContain("'  +Games");
    expect(row).toContain("'@shop");
    expect(row).toContain('"12 ""Elm"" Road\nFlat 2"');
    expect(row).toContain("'=secret");
  });

  it('includes every season and archived records only in the all-seasons scope', () => {
    const activeOnly = buildCsv(data(), { scope: 'active', includeSensitive: false });
    const all = buildCsv(data(), { scope: 'all', includeSensitive: false });

    expect(activeOnly.rowCount).toBe(1);
    expect(all.rowCount).toBe(2);
    expect(all.content).toContain('Christmas 2025,Sam,,Mug');
    expect(all.content).toContain('Mug,,,,,,No,,No,,No,,,');
  });

  it('uses the configured fraction digits without a currency symbol', () => {
    const result = buildCsv(data({ settings: makeSettings({ fractionDigits: 0 }) }), {
      scope: 'active',
      includeSensitive: false,
    });

    expect(result.content).toContain(',123456,500,Yes,');
    expect(result.content).not.toContain('$');
  });

  it('refuses to export the active scope when there is no active season', () => {
    const archivedOnly = data({
      seasons: [makeSeason({ status: 'archived', archivedAt: '2026-01-02T00:00:00.000Z' })],
    });

    expect(() => buildCsv(archivedOnly, { scope: 'active', includeSensitive: false })).toThrow(
      ExportError,
    );
  });

  it('renders every delivery method as a human label in the export', () => {
    const labels: Record<DeliveryMethod, string> = {
      hand_delivered: 'Hand delivered',
      shipped: 'Shipped',
      digital: 'Digital',
      retailer_direct: 'Retailer direct',
      other: 'Other',
    };
    const list = data();
    const gifts: Gift[] = Object.entries(labels).map(([method, label], index) => {
      const gift = makeGift({
        id: `33333333-3333-4333-8333-${String(index).padStart(12, '0')}` as Gift['id'],
        name: label,
        deliveryMethod: method as DeliveryMethod,
      });
      return gift;
    });

    const result = buildCsv({ ...list, gifts }, { scope: 'active', includeSensitive: false });
    const firstName = gifts[0]!.name;

    expect(firstName).toBe('Hand delivered');
    for (const label of Object.values(labels)) {
      expect(result.content).toContain(label);
    }
  });
});

describe('CSV storage export', () => {
  let storage: TestStorage;

  beforeEach(async () => {
    storage = await createTestStorage();
  });

  afterEach(async () => {
    await storage.cleanup();
  });

  it('loads stored records and returns a download-ready file', async () => {
    const season = await storage.repositories.seasons.create({
      name: 'Christmas 2026',
      holidayDate: '2026-12-25',
    });
    const recipient = await storage.repositories.recipients.create({
      seasonId: season.id,
      name: 'Alex',
    });
    await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Scarf',
      plannedBudgetMinor: 2500,
    });

    const result = await storage.repositories.data.exportCsv({
      scope: 'active',
      includeSensitive: false,
    });

    expect(result.filename).toMatch(/^christmas-gift-tracker-gifts-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(result.rowCount).toBe(1);
    expect(result.content).toContain('Christmas 2026,Alex,,Scarf');
    expect(result.content).not.toContain('Address');
  });
});
