import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { calculateSeasonTotals } from '../domain/calculations/dashboard';
import { ConflictError } from '../domain/errors';
import { createTestStorage, type TestStorage } from '../test/storage';

let storage: TestStorage;

beforeEach(async () => {
  storage = await createTestStorage();
});

afterEach(async () => {
  await storage.cleanup();
});

describe('season switching', () => {
  it('archives the current season atomically when a new season is created', async () => {
    const first = await storage.repositories.seasons.create({
      name: 'Christmas 2025',
      holidayDate: '2025-12-25',
      budgetMinor: 40000,
    });
    const recipient = await storage.repositories.recipients.create({
      seasonId: first.id,
      name: 'Alex',
      relationship: 'Family',
      budgetCapMinor: 15000,
      notes: 'Prefers practical gifts.',
    });
    await storage.repositories.gifts.create({
      seasonId: first.id,
      recipientId: recipient.id,
      name: 'Scarf',
      plannedBudgetMinor: 3500,
    });

    const second = await storage.repositories.seasons.create(
      { name: 'Christmas 2026', holidayDate: '2026-12-25' },
      { copyRecipientsFromId: first.id, archiveCurrent: true },
    );

    const archived = await storage.repositories.seasons.get(first.id);
    expect(archived.status).toBe('archived');
    expect(archived.archivedAt).not.toBeNull();
    expect(second.status).toBe('active');
    expect((await storage.repositories.settings.get()).activeSeasonId).toBe(second.id);
    expect(
      (await storage.repositories.seasons.list()).filter((s) => s.status === 'active'),
    ).toHaveLength(1);

    const copied = await storage.repositories.recipients.listBySeason(second.id);
    expect(copied).toHaveLength(1);
    expect(copied[0]).toMatchObject({
      name: 'Alex',
      relationship: 'Family',
      budgetCapMinor: 15000,
      notes: 'Prefers practical gifts.',
    });
    expect(copied[0]!.id).not.toBe(recipient.id);
    expect(await storage.repositories.gifts.listBySeason(second.id)).toHaveLength(0);
    expect(await storage.repositories.gifts.listBySeason(first.id)).toHaveLength(1);
  });

  it('still refuses a second active season without explicit archive consent', async () => {
    const first = await storage.repositories.seasons.create({
      name: 'First',
      holidayDate: '2026-12-25',
    });

    await expect(
      storage.repositories.seasons.create({ name: 'Second', holidayDate: '2027-12-25' }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect((await storage.repositories.seasons.get(first.id)).status).toBe('active');
  });

  it('rejects archiving the current season when the new season is not active', async () => {
    await expect(
      storage.repositories.seasons.create(
        { name: 'Archive only', holidayDate: '2026-12-25', status: 'archived' },
        { archiveCurrent: true },
      ),
    ).rejects.toThrow(/Only a new active season/);
  });

  it('supports zero active seasons and returning to an active one', async () => {
    const first = await storage.repositories.seasons.create({
      name: 'Christmas 2026',
      holidayDate: '2026-12-25',
    });
    await storage.repositories.seasons.archive(first.id);

    expect(await storage.repositories.seasons.getActive()).toBeNull();
    expect((await storage.repositories.settings.get()).activeSeasonId).toBeNull();

    const second = await storage.repositories.seasons.create({
      name: 'Christmas 2027',
      holidayDate: '2027-12-25',
    });
    expect((await storage.repositories.seasons.getActive())?.id).toBe(second.id);
  });
});

describe('season isolation', () => {
  it('keeps totals and records for two seasons separate', async () => {
    const first = await storage.repositories.seasons.create({
      name: 'Christmas 2025',
      holidayDate: '2025-12-25',
      budgetMinor: 10000,
    });
    const firstRecipient = await storage.repositories.recipients.create({
      seasonId: first.id,
      name: 'Alex',
    });
    await storage.repositories.gifts.create({
      seasonId: first.id,
      recipientId: firstRecipient.id,
      name: 'Scarf',
      plannedBudgetMinor: 2500,
      actualCostMinor: 2500,
      bought: true,
    });
    await storage.repositories.seasons.archive(first.id);

    const second = await storage.repositories.seasons.create({
      name: 'Christmas 2026',
      holidayDate: '2026-12-25',
      budgetMinor: 20000,
    });
    const secondRecipient = await storage.repositories.recipients.create({
      seasonId: second.id,
      name: 'Sam',
    });
    await storage.repositories.gifts.create({
      seasonId: second.id,
      recipientId: secondRecipient.id,
      name: 'Board game',
      plannedBudgetMinor: 6000,
    });

    const firstGifts = await storage.repositories.gifts.listBySeason(first.id);
    const secondGifts = await storage.repositories.gifts.listBySeason(second.id);

    expect(firstGifts.map((gift) => gift.name)).toEqual(['Scarf']);
    expect(secondGifts.map((gift) => gift.name)).toEqual(['Board game']);
    expect(calculateSeasonTotals(first, firstGifts)).toMatchObject({
      plannedTotalMinor: 2500,
      actualSpentMinor: 2500,
    });
    expect(calculateSeasonTotals(second, secondGifts)).toMatchObject({
      plannedTotalMinor: 6000,
      actualSpentMinor: 0,
    });
    expect(await storage.repositories.recipients.listBySeason(second.id)).toHaveLength(1);
  });
});
