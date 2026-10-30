import type { Recipient, RecipientId, SeasonId } from '../../domain/entities';
import { NotFoundError, ValidationError } from '../../domain/errors';
import {
  giftEntitySchema,
  ideaEntitySchema,
  parseWithSchema,
  recipientCreateInputSchema,
  recipientEntitySchema,
  recipientUpdateInputSchema,
  type RecipientCreateInput,
  type RecipientUpdateInput,
} from '../../domain/schemas';
import { createId } from '../../lib/ids';
import { recordLocalChange } from '../changeTracking';
import { withStorageErrors } from '../errors';
import {
  applyDefined,
  assertWritableSeason,
  readRecipient,
  type RepositoryContext,
} from './context';

export type RecipientDeletePolicy =
  | { type: 'reassign'; targetRecipientId: RecipientId }
  | { type: 'cascade'; confirmationName: string };

export interface RecipientDeleteResult {
  deletedGiftCount: number;
  reassignedGiftCount: number;
  unassignedIdeaCount: number;
}

export interface RecipientRepository {
  listBySeason(seasonId: SeasonId): Promise<Recipient[]>;
  get(id: RecipientId): Promise<Recipient>;
  create(input: RecipientCreateInput): Promise<Recipient>;
  update(id: RecipientId, input: RecipientUpdateInput): Promise<Recipient>;
  deleteWithPolicy(id: RecipientId, policy: RecipientDeletePolicy): Promise<RecipientDeleteResult>;
}

export function createRecipientRepository(context: RepositoryContext): RecipientRepository {
  const { db } = context;

  return {
    listBySeason(seasonId) {
      return withStorageErrors(async () => {
        const recipients = await db.recipients.where('seasonId').equals(seasonId).toArray();

        return recipients
          .map((recipient) =>
            parseWithSchema(recipientEntitySchema, recipient, 'A saved recipient is invalid.'),
          )
          .sort(
            (left, right) =>
              left.name.localeCompare(right.name) || left.createdAt.localeCompare(right.createdAt),
          );
      });
    },

    get(id) {
      return withStorageErrors(() => readRecipient(context, id));
    },

    create(input) {
      return withStorageErrors(async () => {
        const parsed = parseWithSchema(
          recipientCreateInputSchema,
          input,
          'The new recipient is invalid.',
        );

        return db.transaction(
          'rw',
          db.recipients,
          db.seasons,
          db.syncOutbox,
          db.syncTombstones,
          async () => {
            await assertWritableSeason(context, parsed.seasonId);
            const timestamp = context.nowIso();
            const recipient = parseWithSchema(
              recipientEntitySchema,
              {
                id: createId(),
                seasonId: parsed.seasonId,
                name: parsed.name,
                relationship: parsed.relationship ?? null,
                budgetCapMinor: parsed.budgetCapMinor ?? null,
                notes: parsed.notes ?? null,
                createdAt: timestamp,
                updatedAt: timestamp,
              },
              'The new recipient is invalid.',
            );

            await db.recipients.add(recipient);
            await recordLocalChange(db, {
              entityType: 'recipient',
              entityId: recipient.id,
              operation: 'upsert',
              at: timestamp,
            });
            return recipient;
          },
        );
      });
    },

    update(id, input) {
      return withStorageErrors(async () => {
        const parsed = parseWithSchema(
          recipientUpdateInputSchema,
          input,
          'The recipient change is invalid.',
        );

        return db.transaction(
          'rw',
          db.recipients,
          db.seasons,
          db.syncOutbox,
          db.syncTombstones,
          async () => {
            const current = await readRecipient(context, id);
            await assertWritableSeason(context, current.seasonId);
            const timestamp = context.nowIso();
            const next = parseWithSchema(
              recipientEntitySchema,
              { ...applyDefined(current, parsed), updatedAt: timestamp },
              'The recipient change is invalid.',
            );

            await db.recipients.put(next);
            await recordLocalChange(db, {
              entityType: 'recipient',
              entityId: next.id,
              operation: 'upsert',
              at: timestamp,
            });
            return next;
          },
        );
      });
    },

    deleteWithPolicy(id, policy) {
      return withStorageErrors(async () => {
        return db.transaction(
          'rw',
          [db.recipients, db.gifts, db.ideas, db.seasons, db.syncOutbox, db.syncTombstones],
          async () => {
            const recipient = await readRecipient(context, id);
            await assertWritableSeason(context, recipient.seasonId);

            const gifts = await db.gifts.where('recipientId').equals(id).toArray();
            const ideas = await db.ideas.where('recipientId').equals(id).toArray();
            const timestamp = context.nowIso();

            if (policy.type === 'cascade') {
              if (policy.confirmationName.trim() !== recipient.name) {
                throw new ValidationError('Type the recipient name exactly to delete them.', [
                  {
                    path: 'confirmationName',
                    message: 'The confirmation does not match the recipient name.',
                  },
                ]);
              }

              if (gifts.length > 0) {
                await db.gifts.bulkDelete(gifts.map((gift) => gift.id));
                for (const gift of gifts) {
                  await recordLocalChange(db, {
                    entityType: 'gift',
                    entityId: gift.id,
                    operation: 'delete',
                    at: timestamp,
                  });
                }
              }
            } else {
              if (policy.targetRecipientId === id) {
                throw new ValidationError('Choose a different recipient for the gifts.', [
                  {
                    path: 'targetRecipientId',
                    message: 'Gifts cannot be reassigned to the recipient being deleted.',
                  },
                ]);
              }

              const target = await db.recipients.get(policy.targetRecipientId);

              if (!target) {
                throw new NotFoundError('Recipient', policy.targetRecipientId);
              }

              if (target.seasonId !== recipient.seasonId) {
                throw new ValidationError('Choose a recipient in the same season.', [
                  {
                    path: 'targetRecipientId',
                    message: 'The new recipient belongs to a different season.',
                  },
                ]);
              }

              for (const gift of gifts) {
                const updated = parseWithSchema(
                  giftEntitySchema,
                  { ...gift, recipientId: target.id, updatedAt: timestamp },
                  'A gift could not be reassigned safely.',
                );
                await db.gifts.put(updated);
                await recordLocalChange(db, {
                  entityType: 'gift',
                  entityId: updated.id,
                  operation: 'upsert',
                  at: timestamp,
                });
              }
            }

            for (const idea of ideas) {
              const updated = parseWithSchema(
                ideaEntitySchema,
                { ...idea, recipientId: null, updatedAt: timestamp },
                'An idea could not be unassigned safely.',
              );
              await db.ideas.put(updated);
              await recordLocalChange(db, {
                entityType: 'idea',
                entityId: updated.id,
                operation: 'upsert',
                at: timestamp,
              });
            }

            await db.recipients.delete(id);
            await recordLocalChange(db, {
              entityType: 'recipient',
              entityId: id,
              operation: 'delete',
              at: timestamp,
            });

            return {
              deletedGiftCount: policy.type === 'cascade' ? gifts.length : 0,
              reassignedGiftCount: policy.type === 'reassign' ? gifts.length : 0,
              unassignedIdeaCount: ideas.length,
            };
          },
        );
      });
    },
  };
}
