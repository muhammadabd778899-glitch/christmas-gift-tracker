import type { Gift, Idea, IdeaId, RecipientId, SeasonId } from '../../domain/entities';
import { ConflictError, NotFoundError } from '../../domain/errors';
import {
  giftEntitySchema,
  ideaCreateInputSchema,
  ideaEntitySchema,
  ideaUpdateInputSchema,
  parseWithSchema,
  type IdeaCreateInput,
  type IdeaUpdateInput,
} from '../../domain/schemas';
import { createId } from '../../lib/ids';
import { withStorageErrors } from '../errors';
import {
  applyDefined,
  assertRecipientInSeason,
  assertWritableSeason,
  type RepositoryContext,
} from './context';

export interface IdeaRepository {
  listBySeason(seasonId: SeasonId): Promise<Idea[]>;
  get(id: IdeaId): Promise<Idea>;
  create(input: IdeaCreateInput): Promise<Idea>;
  update(id: IdeaId, input: IdeaUpdateInput): Promise<Idea>;
  convert(id: IdeaId, recipientId: RecipientId): Promise<Gift>;
  reopen(id: IdeaId): Promise<Idea>;
  delete(id: IdeaId): Promise<void>;
}

async function readIdea(context: RepositoryContext, id: IdeaId): Promise<Idea> {
  const idea = await context.db.ideas.get(id);

  if (!idea) {
    throw new NotFoundError('Idea', id);
  }

  return parseWithSchema(ideaEntitySchema, idea, 'The saved idea is invalid.');
}

export function createIdeaRepository(context: RepositoryContext): IdeaRepository {
  const { db } = context;

  return {
    listBySeason(seasonId) {
      return withStorageErrors(async () => {
        const ideas = await db.ideas.where('seasonId').equals(seasonId).toArray();

        return ideas
          .map((idea) => parseWithSchema(ideaEntitySchema, idea, 'A saved idea is invalid.'))
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      });
    },

    get(id) {
      return withStorageErrors(() => readIdea(context, id));
    },

    create(input) {
      return withStorageErrors(async () => {
        const parsed = parseWithSchema(ideaCreateInputSchema, input, 'The new idea is invalid.');

        return db.transaction('rw', db.ideas, db.seasons, db.recipients, async () => {
          await assertWritableSeason(context, parsed.seasonId);

          if (parsed.recipientId) {
            await assertRecipientInSeason(context, parsed.recipientId, parsed.seasonId);
          }

          const timestamp = context.nowIso();
          const idea = parseWithSchema(
            ideaEntitySchema,
            {
              id: createId(),
              seasonId: parsed.seasonId,
              recipientId: parsed.recipientId ?? null,
              name: parsed.name,
              category: parsed.category ?? null,
              store: parsed.store ?? null,
              purchaseUrl: parsed.purchaseUrl ?? null,
              estimatedPriceMinor: parsed.estimatedPriceMinor ?? null,
              notes: parsed.notes ?? null,
              status: 'active',
              convertedGiftId: null,
              convertedAt: null,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
            'The new idea is invalid.',
          );

          await db.ideas.add(idea);
          return idea;
        });
      });
    },

    update(id, input) {
      return withStorageErrors(async () => {
        const parsed = parseWithSchema(ideaUpdateInputSchema, input, 'The idea change is invalid.');

        return db.transaction('rw', db.ideas, db.seasons, db.recipients, async () => {
          const current = await readIdea(context, id);
          await assertWritableSeason(context, current.seasonId);

          if (parsed.recipientId !== undefined && parsed.recipientId !== null) {
            await assertRecipientInSeason(context, parsed.recipientId, current.seasonId);
          }

          const next = parseWithSchema(
            ideaEntitySchema,
            { ...applyDefined(current, parsed), updatedAt: context.nowIso() },
            'The idea change is invalid.',
          );

          await db.ideas.put(next);
          return next;
        });
      });
    },

    convert(id, recipientId) {
      return withStorageErrors(async () => {
        return db.transaction('rw', db.ideas, db.gifts, db.seasons, db.recipients, async () => {
          const idea = await readIdea(context, id);
          await assertWritableSeason(context, idea.seasonId);

          if (idea.status === 'converted') {
            if (idea.convertedGiftId) {
              const existing = await db.gifts.get(idea.convertedGiftId);

              if (existing && existing.seasonId === idea.seasonId) {
                return parseWithSchema(giftEntitySchema, existing, 'The linked gift is invalid.');
              }
            }

            throw new ConflictError(
              'This idea is marked converted, but its gift is missing.',
              'Reopen the idea before converting it again.',
            );
          }

          await assertRecipientInSeason(context, recipientId, idea.seasonId);
          const existingLink = await db.gifts.where('sourceIdeaId').equals(idea.id).first();

          if (existingLink) {
            throw new ConflictError(
              'This idea already has a linked gift.',
              'Refresh the Idea Bank and open the existing gift.',
            );
          }

          const timestamp = context.nowIso();
          const gift = parseWithSchema(
            giftEntitySchema,
            {
              id: createId(),
              seasonId: idea.seasonId,
              recipientId,
              name: idea.name,
              category: idea.category,
              store: idea.store,
              purchaseUrl: idea.purchaseUrl,
              plannedBudgetMinor: idea.estimatedPriceMinor,
              actualCostMinor: null,
              bought: false,
              boughtOn: null,
              wrapped: false,
              wrappedOn: null,
              sent: false,
              sentOn: null,
              deliveryMethod: null,
              address: null,
              notes: idea.notes,
              sourceIdeaId: idea.id,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
            'The converted gift is invalid.',
          );

          await db.gifts.add(gift);

          const converted = parseWithSchema(
            ideaEntitySchema,
            {
              ...idea,
              status: 'converted',
              convertedGiftId: gift.id,
              convertedAt: timestamp,
              updatedAt: timestamp,
            },
            'The idea could not be marked converted.',
          );

          await db.ideas.put(converted);
          return gift;
        });
      });
    },

    reopen(id) {
      return withStorageErrors(async () => {
        return db.transaction('rw', db.ideas, db.gifts, db.seasons, async () => {
          const idea = await readIdea(context, id);
          await assertWritableSeason(context, idea.seasonId);

          if (idea.status === 'active') {
            return idea;
          }

          if (idea.convertedGiftId) {
            const linkedGift = await db.gifts.get(idea.convertedGiftId);

            if (linkedGift) {
              throw new ConflictError(
                'Delete the linked gift to return this idea to the Idea Bank.',
                'Open the gift and delete it first.',
              );
            }
          }

          const reopened = parseWithSchema(
            ideaEntitySchema,
            {
              ...idea,
              status: 'active',
              convertedGiftId: null,
              convertedAt: null,
              updatedAt: context.nowIso(),
            },
            'The idea could not be reopened.',
          );

          await db.ideas.put(reopened);
          return reopened;
        });
      });
    },

    delete(id) {
      return withStorageErrors(async () => {
        return db.transaction('rw', db.ideas, db.gifts, db.seasons, async () => {
          const idea = await readIdea(context, id);
          await assertWritableSeason(context, idea.seasonId);
          const timestamp = context.nowIso();
          const linkedGifts = await db.gifts.where('sourceIdeaId').equals(idea.id).toArray();

          for (const gift of linkedGifts) {
            const updated = { ...gift, updatedAt: timestamp };
            delete updated.sourceIdeaId;
            const validated = parseWithSchema(
              giftEntitySchema,
              updated,
              'A linked gift could not be unlinked safely.',
            );
            await db.gifts.put(validated);
          }

          await db.ideas.delete(idea.id);
        });
      });
    },
  };
}
