import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SeasonId } from '../domain/entities';
import { ConflictError, NotFoundError, ValidationError } from '../domain/errors';
import { createTestStorage, type TestStorage } from '../test/storage';
import { FIXED_IDS, makeGift, makeSeason } from '../test/fixtures';

let storage: TestStorage;

beforeEach(async () => {
  storage = await createTestStorage();
});

afterEach(async () => {
  await storage.cleanup();
});

async function createActiveSeason(name = 'Christmas 2026') {
  return storage.repositories.seasons.create({
    name,
    holidayDate: '2026-12-25',
    budgetMinor: 50000,
  });
}

async function createActiveSeasonWithRecipient() {
  const season = await createActiveSeason();
  const recipient = await storage.repositories.recipients.create({
    seasonId: season.id,
    name: 'Alex',
    relationship: 'Family',
    budgetCapMinor: 15000,
  });

  return { season, recipient };
}

describe('season repository', () => {
  it('creates an active season, selects it, reads it, and updates it with a stable ID', async () => {
    const season = await createActiveSeason();

    expect(season.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(season.status).toBe('active');
    expect(season.budgetMinor).toBe(50000);
    expect((await storage.repositories.settings.get()).activeSeasonId).toBe(season.id);
    expect(await storage.repositories.seasons.get(season.id)).toEqual(season);
    expect(await storage.repositories.seasons.getActive()).toEqual(season);
    expect(await storage.repositories.seasons.list()).toEqual([season]);

    const updated = await storage.repositories.seasons.update(season.id, {
      name: 'Christmas at home',
      budgetMinor: null,
    });

    expect(updated.id).toBe(season.id);
    expect(updated.name).toBe('Christmas at home');
    expect(updated.budgetMinor).toBeNull();
    expect(updated.createdAt).toBe(season.createdAt);
    expect(updated.updatedAt >= season.updatedAt).toBe(true);
  });

  it('never allows two active seasons', async () => {
    await createActiveSeason('First season');

    await expect(createActiveSeason('Second season')).rejects.toBeInstanceOf(ConflictError);
    expect(await storage.repositories.seasons.list()).toHaveLength(1);
  });

  it('archives the active season, clears the selection, and blocks child writes', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const archived = await storage.repositories.seasons.archive(season.id);

    expect(archived.status).toBe('archived');
    expect(archived.archivedAt).not.toBeNull();
    expect((await storage.repositories.settings.get()).activeSeasonId).toBeNull();
    expect(await storage.repositories.seasons.getActive()).toBeNull();

    await expect(
      storage.repositories.recipients.update(recipient.id, { name: 'Changed' }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      storage.repositories.gifts.create({
        seasonId: season.id,
        recipientId: recipient.id,
        name: 'A gift',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('restores an archived season and archives the previously active one atomically', async () => {
    const first = await createActiveSeason('First season');
    await storage.repositories.seasons.archive(first.id);
    const second = await createActiveSeason('Second season');
    const restored = await storage.repositories.seasons.restore(first.id);

    expect(restored.status).toBe('active');
    expect(restored.archivedAt).toBeNull();
    expect((await storage.repositories.settings.get()).activeSeasonId).toBe(first.id);

    const seasons = await storage.repositories.seasons.list();
    expect(seasons.find((season) => season.id === second.id)?.status).toBe('archived');
    expect(seasons.filter((season) => season.status === 'active')).toHaveLength(1);
  });

  it('rolls back both seasons when selecting the restored season fails', async () => {
    const first = await createActiveSeason('First season');
    await storage.repositories.seasons.archive(first.id);
    const second = await createActiveSeason('Second season');

    vi.spyOn(storage.db.settings, 'put').mockRejectedValueOnce(
      new Error('forced failure after archiving the previous season'),
    );

    await expect(storage.repositories.seasons.restore(first.id)).rejects.toThrow();

    expect((await storage.db.seasons.get(first.id))?.status).toBe('archived');
    expect((await storage.db.seasons.get(second.id))?.status).toBe('active');
    expect((await storage.repositories.settings.get()).activeSeasonId).toBe(second.id);
  });

  it('deletes an archived season only with the exact name and removes its children', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    await storage.repositories.recipients.create({
      seasonId: season.id,
      name: 'Sam',
      budgetCapMinor: 0,
    });
    await storage.repositories.seasons.archive(season.id);

    await expect(
      storage.repositories.seasons.delete(season.id, 'wrong name'),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await storage.repositories.seasons.get(season.id)).toBeDefined();

    await storage.repositories.seasons.delete(season.id, 'Christmas 2026');
    expect(await storage.db.seasons.count()).toBe(0);
    expect(await storage.db.recipients.where('seasonId').equals(season.id).count()).toBe(0);
    expect(recipient.id).toBeDefined();
  });

  it('copies recipients into a new season with new IDs and no gifts', async () => {
    const source = await createActiveSeason('Source season');
    await storage.repositories.recipients.create({
      seasonId: source.id,
      name: 'Alex',
      relationship: 'Family',
      budgetCapMinor: 15000,
      notes: 'Note',
    });
    await storage.repositories.seasons.archive(source.id);

    const target = await storage.repositories.seasons.create(
      { name: 'Target season', holidayDate: '2027-12-25' },
      { copyRecipientsFromId: source.id },
    );
    const copied = await storage.repositories.recipients.listBySeason(target.id);

    expect(copied).toHaveLength(1);
    expect(copied[0]?.name).toBe('Alex');
    expect(copied[0]?.seasonId).toBe(target.id);
    expect(copied[0]?.id).not.toBe(
      (await storage.repositories.recipients.listBySeason(source.id))[0]?.id,
    );
  });
});

describe('recipient repository', () => {
  it('creates, lists, reads, and updates a recipient while preserving its ID', async () => {
    const season = await createActiveSeason();
    const recipient = await storage.repositories.recipients.create({
      seasonId: season.id,
      name: '  Alex  ',
      relationship: 'Family',
      budgetCapMinor: 0,
      notes: 'Prefers practical gifts.',
    });

    expect(recipient.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(recipient.name).toBe('Alex');
    expect(recipient.budgetCapMinor).toBe(0);
    expect(await storage.repositories.recipients.listBySeason(season.id)).toEqual([recipient]);
    expect(await storage.repositories.recipients.get(recipient.id)).toEqual(recipient);

    const updated = await storage.repositories.recipients.update(recipient.id, {
      name: 'Alexandra',
      budgetCapMinor: null,
      notes: null,
    });

    expect(updated.id).toBe(recipient.id);
    expect(updated.name).toBe('Alexandra');
    expect(updated.budgetCapMinor).toBeNull();
    expect(updated.notes).toBeNull();
    expect(updated.createdAt).toBe(recipient.createdAt);
    expect(updated.updatedAt >= recipient.updatedAt).toBe(true);
  });

  it('allows duplicate names without conflating records', async () => {
    const season = await createActiveSeason();
    const first = await storage.repositories.recipients.create({
      seasonId: season.id,
      name: 'Alex',
    });
    const second = await storage.repositories.recipients.create({
      seasonId: season.id,
      name: 'Alex',
    });

    expect(first.id).not.toBe(second.id);
    expect(await storage.repositories.recipients.listBySeason(season.id)).toHaveLength(2);
  });

  it('rejects invalid caps and a missing season before writing', async () => {
    await expect(
      storage.repositories.recipients.create({
        seasonId: FIXED_IDS.otherSeason as SeasonId,
        name: 'No season',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    const season = await createActiveSeason();
    await expect(
      storage.repositories.recipients.create({
        seasonId: season.id,
        name: 'Negative cap',
        budgetCapMinor: -1,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await storage.db.recipients.count()).toBe(0);
  });

  it('deletes a recipient with no gifts through the explicit cascade policy', async () => {
    const { recipient } = await createActiveSeasonWithRecipient();
    const result = await storage.repositories.recipients.deleteWithPolicy(recipient.id, {
      type: 'cascade',
      confirmationName: 'Alex',
    });

    expect(result.deletedGiftCount).toBe(0);
    await expect(storage.repositories.recipients.get(recipient.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('reassigns gifts and unassigns ideas in one transaction', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const target = await storage.repositories.recipients.create({
      seasonId: season.id,
      name: 'Sam',
    });
    const gift = await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Warm scarf',
    });
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Book of walks',
    });

    const result = await storage.repositories.recipients.deleteWithPolicy(recipient.id, {
      type: 'reassign',
      targetRecipientId: target.id,
    });

    expect(result.reassignedGiftCount).toBe(1);
    expect(result.unassignedIdeaCount).toBe(1);
    expect((await storage.repositories.gifts.get(gift.id)).recipientId).toBe(target.id);
    expect((await storage.repositories.ideas.get(idea.id)).recipientId).toBeNull();
    expect(await storage.db.recipients.get(recipient.id)).toBeUndefined();
  });

  it('cascades gifts and unassigns ideas only after exact confirmation', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const gift = await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Warm scarf',
    });
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Book of walks',
    });

    await expect(
      storage.repositories.recipients.deleteWithPolicy(recipient.id, {
        type: 'cascade',
        confirmationName: 'Wrong',
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(await storage.db.gifts.get(gift.id)).toBeDefined();
    expect((await storage.db.ideas.get(idea.id))?.recipientId).toBe(recipient.id);

    const result = await storage.repositories.recipients.deleteWithPolicy(recipient.id, {
      type: 'cascade',
      confirmationName: 'Alex',
    });

    expect(result.deletedGiftCount).toBe(1);
    expect(await storage.db.gifts.get(gift.id)).toBeUndefined();
    expect((await storage.repositories.ideas.get(idea.id)).recipientId).toBeNull();
    expect(await storage.db.recipients.get(recipient.id)).toBeUndefined();
  });

  it('rolls back every change when a multi-record deletion fails', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const target = await storage.repositories.recipients.create({
      seasonId: season.id,
      name: 'Sam',
    });
    const gift = await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Warm scarf',
    });
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Book of walks',
    });

    vi.spyOn(storage.db.recipients, 'delete').mockRejectedValueOnce(
      new Error('forced failure after gift reassignment'),
    );

    await expect(
      storage.repositories.recipients.deleteWithPolicy(recipient.id, {
        type: 'reassign',
        targetRecipientId: target.id,
      }),
    ).rejects.toThrow();

    expect((await storage.db.gifts.get(gift.id))?.recipientId).toBe(recipient.id);
    expect((await storage.db.ideas.get(idea.id))?.recipientId).toBe(recipient.id);
    expect(await storage.db.recipients.get(recipient.id)).toBeDefined();
  });
});

describe('gift repository', () => {
  it('creates, lists, reads, and updates a gift with stable IDs and integer money', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const gift = await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Warm scarf',
      plannedBudgetMinor: 2500,
      actualCostMinor: 1999,
      store: 'Local market',
    });

    expect(gift.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(gift.plannedBudgetMinor).toBe(2500);
    expect(Number.isInteger(gift.actualCostMinor)).toBe(true);
    expect(gift.bought).toBe(false);
    expect(await storage.repositories.gifts.listBySeason(season.id)).toEqual([gift]);
    expect(await storage.repositories.gifts.listByRecipient(recipient.id)).toEqual([gift]);

    const updated = await storage.repositories.gifts.update(gift.id, {
      name: 'Warm wool scarf',
      plannedBudgetMinor: null,
    });

    expect(updated.id).toBe(gift.id);
    expect(updated.seasonId).toBe(gift.seasonId);
    expect(updated.recipientId).toBe(gift.recipientId);
    expect(updated.createdAt).toBe(gift.createdAt);
    expect(updated.plannedBudgetMinor).toBeNull();
    expect(updated.updatedAt >= gift.updatedAt).toBe(true);
  });

  it('rejects missing and cross-season recipients', async () => {
    const first = await createActiveSeason('First season');
    const firstRecipient = await storage.repositories.recipients.create({
      seasonId: first.id,
      name: 'Alex',
    });
    await storage.repositories.seasons.archive(first.id);
    const second = await createActiveSeason('Second season');

    await expect(
      storage.repositories.gifts.create({
        seasonId: second.id,
        recipientId: firstRecipient.id,
        name: 'Cross-season gift',
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      storage.repositories.gifts.create({
        seasonId: second.id,
        recipientId: FIXED_IDS.otherRecipient as typeof firstRecipient.id,
        name: 'Missing recipient gift',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(await storage.db.gifts.count()).toBe(0);
  });

  it('rejects invalid dates, status combinations, and malformed money before writing', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();

    await expect(
      storage.repositories.gifts.create({
        seasonId: season.id,
        recipientId: recipient.id,
        name: 'Impossible date',
        bought: true,
        boughtOn: '2026-02-30',
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      storage.repositories.gifts.create({
        seasonId: season.id,
        recipientId: recipient.id,
        name: 'Wrapped but not bought',
        wrapped: true,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      storage.repositories.gifts.create({
        seasonId: season.id,
        recipientId: recipient.id,
        name: 'Bad amount',
        plannedBudgetMinor: 1.5,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(await storage.db.gifts.count()).toBe(0);
  });

  it('updates purchase state coherently and clears dependent statuses when un-buying', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const gift = await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Warm scarf',
    });

    const bought = await storage.repositories.gifts.setPurchaseState(gift.id, { bought: true });
    expect(bought.bought).toBe(true);
    expect(bought.boughtOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const wrapped = await storage.repositories.gifts.setPurchaseState(gift.id, { wrapped: true });
    const sent = await storage.repositories.gifts.setPurchaseState(gift.id, { sent: true });
    expect(wrapped.wrappedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(sent.sentOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const unpurchased = await storage.repositories.gifts.setPurchaseState(gift.id, {
      bought: false,
    });
    expect(unpurchased.bought).toBe(false);
    expect(unpurchased.boughtOn).toBeNull();
    expect(unpurchased.wrapped).toBe(false);
    expect(unpurchased.wrappedOn).toBeNull();
    expect(unpurchased.sent).toBe(false);
    expect(unpurchased.sentOn).toBeNull();
  });

  it('keeps status dates consistent through create and update', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const gift = await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Dated gift',
      bought: true,
    });

    expect(gift.boughtOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const wrapped = await storage.repositories.gifts.update(gift.id, {
      wrapped: true,
      wrappedOn: '2026-12-10',
    });
    expect(wrapped).toMatchObject({
      bought: true,
      wrapped: true,
      wrappedOn: '2026-12-10',
      sent: false,
      sentOn: null,
    });

    const cleared = await storage.repositories.gifts.update(gift.id, {
      bought: false,
      boughtOn: null,
      wrapped: false,
      wrappedOn: null,
      sent: false,
      sentOn: null,
    });
    expect(cleared).toMatchObject({
      bought: false,
      boughtOn: null,
      wrapped: false,
      wrappedOn: null,
      sent: false,
      sentOn: null,
    });
  });

  it('rejects direct dependent status changes without bought', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const gift = await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Not bought yet',
    });

    await expect(
      storage.repositories.gifts.update(gift.id, { wrapped: true }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      storage.repositories.gifts.setPurchaseState(gift.id, { sent: true }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(await storage.repositories.gifts.get(gift.id)).toMatchObject({
      bought: false,
      wrapped: false,
      sent: false,
    });
  });

  it('rejects moving a gift to a recipient in another season', async () => {
    const otherSeason = await createActiveSeason('Other season');
    const otherRecipient = await storage.repositories.recipients.create({
      seasonId: otherSeason.id,
      name: 'Other recipient',
    });
    await storage.repositories.seasons.archive(otherSeason.id);

    const { season, recipient } = await createActiveSeasonWithRecipient();
    const gift = await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Warm scarf',
    });

    await expect(
      storage.repositories.gifts.update(gift.id, { recipientId: otherRecipient.id }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect((await storage.repositories.gifts.get(gift.id)).recipientId).toBe(recipient.id);
  });

  it('deletes a gift and leaves its recipient intact', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const gift = await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Warm scarf',
    });

    await storage.repositories.gifts.delete(gift.id);

    expect(await storage.db.gifts.get(gift.id)).toBeUndefined();
    expect(await storage.repositories.recipients.get(recipient.id)).toBeDefined();
  });
});

describe('idea repository and conversion', () => {
  it('creates, updates, converts idempotently, and reopens through gift deletion', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Book of walks',
      estimatedPriceMinor: 1800,
    });

    expect(idea.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(idea.status).toBe('active');
    expect(idea.convertedGiftId).toBeNull();

    const updated = await storage.repositories.ideas.update(idea.id, {
      name: 'Book of long walks',
      recipientId: null,
    });
    expect(updated.id).toBe(idea.id);
    expect(updated.recipientId).toBeNull();
    expect(updated.name).toBe('Book of long walks');

    const gift = await storage.repositories.ideas.convert(idea.id, recipient.id);
    const converted = await storage.repositories.ideas.get(idea.id);

    expect(gift.sourceIdeaId).toBe(idea.id);
    expect(gift.plannedBudgetMinor).toBe(1800);
    expect(gift.bought).toBe(false);
    expect(converted.status).toBe('converted');
    expect(converted.convertedGiftId).toBe(gift.id);

    const again = await storage.repositories.ideas.convert(idea.id, recipient.id);
    expect(again.id).toBe(gift.id);
    expect(await storage.db.gifts.where('sourceIdeaId').equals(idea.id).count()).toBe(1);

    await storage.repositories.gifts.delete(gift.id);
    const reopened = await storage.repositories.ideas.get(idea.id);
    expect(reopened.status).toBe('active');
    expect(reopened.convertedGiftId).toBeNull();
    expect(reopened.convertedAt).toBeNull();
  });

  it('rolls back the gift and idea status when conversion fails', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Book of walks',
    });

    vi.spyOn(storage.db.ideas, 'put').mockRejectedValueOnce(
      new Error('forced failure after creating the gift'),
    );

    await expect(storage.repositories.ideas.convert(idea.id, recipient.id)).rejects.toThrow();

    expect(await storage.db.gifts.where('sourceIdeaId').equals(idea.id).count()).toBe(0);
    expect((await storage.repositories.ideas.get(idea.id)).status).toBe('active');
  });

  it('refuses to reopen a converted idea while its gift exists', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Book of walks',
    });
    await storage.repositories.ideas.convert(idea.id, recipient.id);

    await expect(storage.repositories.ideas.reopen(idea.id)).rejects.toBeInstanceOf(ConflictError);
  });

  it('deletes an idea and unlinks its gift without deleting the gift', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Book of walks',
    });
    const gift = await storage.repositories.ideas.convert(idea.id, recipient.id);

    await storage.repositories.ideas.delete(idea.id);

    expect(await storage.db.ideas.get(idea.id)).toBeUndefined();
    expect((await storage.repositories.gifts.get(gift.id)).sourceIdeaId).toBeUndefined();
  });

  it('rejects a cross-season idea recipient before writing', async () => {
    const first = await createActiveSeason('First season');
    const firstRecipient = await storage.repositories.recipients.create({
      seasonId: first.id,
      name: 'Alex',
    });
    await storage.repositories.seasons.archive(first.id);
    const second = await createActiveSeason('Second season');

    await expect(
      storage.repositories.ideas.create({
        seasonId: second.id,
        recipientId: firstRecipient.id,
        name: 'Cross-season idea',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await storage.db.ideas.count()).toBe(0);
  });
});

describe('settings repository', () => {
  it('updates formatting preferences without changing creation time', async () => {
    const original = await storage.repositories.settings.get();

    const updated = await storage.repositories.settings.update({
      currencyCode: 'EUR',
      currencySymbol: '€',
      locale: 'de-DE',
      theme: 'dark',
    });

    expect(updated.id).toBe('app');
    expect(updated.currencyCode).toBe('EUR');
    expect(updated.currencySymbol).toBe('€');
    expect(updated.locale).toBe('de-DE');
    expect(updated.theme).toBe('dark');
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt >= original.updatedAt).toBe(true);
    expect(await storage.db.settings.count()).toBe(1);
  });

  it('rejects selecting a missing or archived season', async () => {
    await expect(
      storage.repositories.settings.setActiveSeason(FIXED_IDS.otherSeason as SeasonId),
    ).rejects.toBeInstanceOf(NotFoundError);

    const season = await createActiveSeason();
    await storage.repositories.seasons.archive(season.id);

    await expect(storage.repositories.settings.setActiveSeason(season.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});

describe('database constraints', () => {
  it('rejects duplicate primary keys', async () => {
    await storage.db.seasons.add(makeSeason());

    await expect(storage.db.seasons.add(makeSeason())).rejects.toThrow();
    expect(await storage.db.seasons.count()).toBe(1);
  });

  it('enforces one gift per source idea with a unique index', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Book of walks',
    });

    await storage.db.gifts.add(
      makeGift({
        id: '33333333-3333-4333-8333-999999999999' as ReturnType<typeof makeGift>['id'],
        seasonId: season.id,
        recipientId: recipient.id,
        name: 'First linked gift',
        sourceIdeaId: idea.id,
      }),
    );
    await expect(
      storage.db.gifts.add(
        makeGift({
          id: '33333333-3333-4333-8333-aaaaaaaaaaaa' as ReturnType<typeof makeGift>['id'],
          seasonId: season.id,
          recipientId: recipient.id,
          name: 'Second linked gift',
          sourceIdeaId: idea.id,
        }),
      ),
    ).rejects.toThrow();
    expect(await storage.db.gifts.where('sourceIdeaId').equals(idea.id).count()).toBe(1);
  });

  it('keeps existing data when a validation error is raised', async () => {
    const { season, recipient } = await createActiveSeasonWithRecipient();
    const gift = await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Warm scarf',
    });

    await expect(
      storage.repositories.gifts.update(gift.id, { name: '   ' }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(await storage.repositories.gifts.get(gift.id)).toEqual(gift);
  });
});
