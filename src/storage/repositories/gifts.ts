import type { Gift, GiftId, RecipientId, SeasonId } from '../../domain/entities';
import { localToday } from '../../domain/dates';
import {
  giftCreateInputSchema,
  giftEntitySchema,
  giftPurchaseStateInputSchema,
  giftUpdateInputSchema,
  ideaEntitySchema,
  parseWithSchema,
  type GiftCreateInput,
  type GiftPurchaseStateInput,
  type GiftUpdateInput,
} from '../../domain/schemas';
import { createId } from '../../lib/ids';
import { withStorageErrors } from '../errors';
import {
  applyDefined,
  assertRecipientInSeason,
  assertWritableSeason,
  readGift,
  type RepositoryContext,
} from './context';

export interface GiftRepository {
  listBySeason(seasonId: SeasonId): Promise<Gift[]>;
  listByRecipient(recipientId: RecipientId): Promise<Gift[]>;
  get(id: GiftId): Promise<Gift>;
  create(input: GiftCreateInput): Promise<Gift>;
  update(id: GiftId, input: GiftUpdateInput): Promise<Gift>;
  setPurchaseState(id: GiftId, input: GiftPurchaseStateInput): Promise<Gift>;
  delete(id: GiftId): Promise<void>;
}

function sortByCreatedAt<T extends { createdAt: string }>(records: T[]): T[] {
  return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function createGiftRepository(context: RepositoryContext): GiftRepository {
  const { db } = context;

  return {
    listBySeason(seasonId) {
      return withStorageErrors(async () => {
        const gifts = await db.gifts.where('seasonId').equals(seasonId).toArray();

        return sortByCreatedAt(
          gifts.map((gift) => parseWithSchema(giftEntitySchema, gift, 'A saved gift is invalid.')),
        );
      });
    },

    listByRecipient(recipientId) {
      return withStorageErrors(async () => {
        const gifts = await db.gifts.where('recipientId').equals(recipientId).toArray();

        return sortByCreatedAt(
          gifts.map((gift) => parseWithSchema(giftEntitySchema, gift, 'A saved gift is invalid.')),
        );
      });
    },

    get(id) {
      return withStorageErrors(async () =>
        parseWithSchema(
          giftEntitySchema,
          await readGift(context, id),
          'The saved gift is invalid.',
        ),
      );
    },

    create(input) {
      return withStorageErrors(async () => {
        const parsed = parseWithSchema(giftCreateInputSchema, input, 'The new gift is invalid.');

        return db.transaction('rw', db.gifts, db.seasons, db.recipients, async () => {
          await assertWritableSeason(context, parsed.seasonId);
          await assertRecipientInSeason(context, parsed.recipientId, parsed.seasonId);
          const timestamp = context.nowIso();
          const gift = parseWithSchema(
            giftEntitySchema,
            {
              id: createId(),
              seasonId: parsed.seasonId,
              recipientId: parsed.recipientId,
              name: parsed.name,
              category: parsed.category ?? null,
              store: parsed.store ?? null,
              purchaseUrl: parsed.purchaseUrl ?? null,
              plannedBudgetMinor: parsed.plannedBudgetMinor ?? null,
              actualCostMinor: parsed.actualCostMinor ?? null,
              bought: parsed.bought,
              boughtOn: parsed.boughtOn ?? null,
              wrapped: parsed.wrapped,
              wrappedOn: parsed.wrappedOn ?? null,
              sent: parsed.sent,
              sentOn: parsed.sentOn ?? null,
              deliveryMethod: parsed.deliveryMethod ?? null,
              address: parsed.address ?? null,
              notes: parsed.notes ?? null,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
            'The new gift is invalid.',
          );

          await db.gifts.add(gift);
          return gift;
        });
      });
    },

    update(id, input) {
      return withStorageErrors(async () => {
        const parsed = parseWithSchema(giftUpdateInputSchema, input, 'The gift change is invalid.');

        return db.transaction('rw', db.gifts, db.seasons, db.recipients, async () => {
          const current = await readGift(context, id);
          await assertWritableSeason(context, current.seasonId);

          if (parsed.recipientId !== undefined && parsed.recipientId !== current.recipientId) {
            await assertRecipientInSeason(context, parsed.recipientId, current.seasonId);
          }

          const next = parseWithSchema(
            giftEntitySchema,
            { ...applyDefined(current, parsed), updatedAt: context.nowIso() },
            'The gift change is invalid.',
          );

          await db.gifts.put(next);
          return next;
        });
      });
    },

    setPurchaseState(id, input) {
      return withStorageErrors(async () => {
        const parsed = parseWithSchema(
          giftPurchaseStateInputSchema,
          input,
          'The gift status change is invalid.',
        );

        return db.transaction('rw', db.gifts, db.seasons, async () => {
          const current = await readGift(context, id);
          await assertWritableSeason(context, current.seasonId);
          const today = localToday(context.now());
          const next: Gift = { ...current, updatedAt: context.nowIso() };

          if (parsed.bought !== undefined) {
            next.bought = parsed.bought;

            if (!parsed.bought) {
              next.boughtOn = null;
              next.wrapped = false;
              next.wrappedOn = null;
              next.sent = false;
              next.sentOn = null;
            }
          }

          if (parsed.boughtOn !== undefined) {
            next.boughtOn = parsed.boughtOn;
          }

          if (parsed.wrapped !== undefined) {
            next.wrapped = parsed.wrapped;

            if (!parsed.wrapped) {
              next.wrappedOn = null;
            }
          }

          if (parsed.wrappedOn !== undefined) {
            next.wrappedOn = parsed.wrappedOn;
          }

          if (parsed.sent !== undefined) {
            next.sent = parsed.sent;

            if (!parsed.sent) {
              next.sentOn = null;
            }
          }

          if (parsed.sentOn !== undefined) {
            next.sentOn = parsed.sentOn;
          }

          if (next.bought && next.boughtOn === null) {
            next.boughtOn = today;
          }

          if (next.wrapped && next.wrappedOn === null) {
            next.wrappedOn = today;
          }

          if (next.sent && next.sentOn === null) {
            next.sentOn = today;
          }

          const validated = parseWithSchema(
            giftEntitySchema,
            next,
            'The gift status change is invalid.',
          );

          await db.gifts.put(validated);
          return validated;
        });
      });
    },

    delete(id) {
      return withStorageErrors(async () => {
        return db.transaction('rw', db.gifts, db.ideas, db.seasons, async () => {
          const gift = await readGift(context, id);
          await assertWritableSeason(context, gift.seasonId);
          const timestamp = context.nowIso();

          if (gift.sourceIdeaId) {
            const idea = await db.ideas.get(gift.sourceIdeaId);

            if (idea) {
              const reopened = parseWithSchema(
                ideaEntitySchema,
                {
                  ...idea,
                  status: 'active',
                  convertedGiftId: null,
                  convertedAt: null,
                  updatedAt: timestamp,
                },
                'The linked idea could not be reopened safely.',
              );

              await db.ideas.put(reopened);
            }
          }

          await db.gifts.delete(gift.id);
        });
      });
    },
  };
}
