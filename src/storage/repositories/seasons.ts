import type { Recipient, Season, SeasonId } from '../../domain/entities';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/errors';
import {
  parseWithSchema,
  recipientEntitySchema,
  seasonCreateInputSchema,
  seasonEntitySchema,
  seasonUpdateInputSchema,
  settingsEntitySchema,
  type SeasonCreateInput,
  type SeasonUpdateInput,
} from '../../domain/schemas';
import { createId } from '../../lib/ids';
import { withStorageErrors } from '../errors';
import {
  applyDefined,
  assertWritableSeason,
  readSeason,
  readSettings,
  type RepositoryContext,
} from './context';

export interface SeasonCreateOptions {
  copyRecipientsFromId?: SeasonId;
  archiveCurrent?: boolean;
}

export interface SeasonRepository {
  list(): Promise<Season[]>;
  get(id: SeasonId): Promise<Season>;
  getActive(): Promise<Season | null>;
  create(input: SeasonCreateInput, options?: SeasonCreateOptions): Promise<Season>;
  update(id: SeasonId, input: SeasonUpdateInput): Promise<Season>;
  archive(id: SeasonId): Promise<Season>;
  restore(id: SeasonId): Promise<Season>;
  delete(id: SeasonId, confirmationName: string): Promise<void>;
  copyRecipients(fromId: SeasonId, toId: SeasonId): Promise<Recipient[]>;
}

async function copyRecipientsIntoSeason(
  context: RepositoryContext,
  fromId: SeasonId,
  toId: SeasonId,
): Promise<Recipient[]> {
  const source = await context.db.seasons.get(fromId);

  if (!source) {
    throw new NotFoundError('Season', fromId);
  }

  const sourceRecipients = await context.db.recipients.where('seasonId').equals(fromId).toArray();
  const copied: Recipient[] = [];
  const timestamp = context.nowIso();

  for (const recipient of sourceRecipients) {
    const copy = parseWithSchema(
      recipientEntitySchema,
      {
        id: createId(),
        seasonId: toId,
        name: recipient.name,
        relationship: recipient.relationship,
        budgetCapMinor: recipient.budgetCapMinor,
        notes: recipient.notes,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      'A copied recipient was invalid.',
    );
    copied.push(copy);
  }

  if (copied.length > 0) {
    await context.db.recipients.bulkAdd(copied);
  }

  return copied;
}

export function createSeasonRepository(context: RepositoryContext): SeasonRepository {
  const { db } = context;

  return {
    list() {
      return withStorageErrors(async () => {
        const seasons = await db.seasons.toArray();
        const validated = seasons.map((season) =>
          parseWithSchema(seasonEntitySchema, season, 'A saved season is invalid.'),
        );

        return validated.sort((left, right) => {
          if (left.status !== right.status) {
            return left.status === 'active' ? -1 : 1;
          }

          return right.holidayDate.localeCompare(left.holidayDate);
        });
      });
    },

    get(id) {
      return withStorageErrors(() => readSeason(context, id));
    },

    getActive() {
      return withStorageErrors(async () => {
        const active = await db.seasons.where('status').equals('active').toArray();

        if (active.length > 1) {
          throw new ConflictError(
            'More than one season is marked active.',
            'Open Settings and run the storage health check before editing.',
          );
        }

        if (active.length === 0) {
          return null;
        }

        return parseWithSchema(seasonEntitySchema, active[0], 'The active season is invalid.');
      });
    },

    create(input, options = {}) {
      return withStorageErrors(async () => {
        const parsed = parseWithSchema(
          seasonCreateInputSchema,
          input,
          'The new season is invalid.',
        );

        return db.transaction('rw', db.seasons, db.recipients, db.settings, async () => {
          const timestamp = context.nowIso();
          const status = parsed.status ?? 'active';

          if (options.archiveCurrent && status !== 'active') {
            throw new ValidationError('Only a new active season can archive the current one.', [
              {
                path: 'status',
                message: 'Create the season as active to archive the current season.',
              },
            ]);
          }

          if (status === 'active') {
            const activeSeasons = await db.seasons.where('status').equals('active').toArray();

            if (activeSeasons.length > 0) {
              if (!options.archiveCurrent) {
                throw new ConflictError(
                  'Another season is already active.',
                  'Archive the current season before creating a new active season.',
                );
              }

              for (const active of activeSeasons) {
                const archived = parseWithSchema(
                  seasonEntitySchema,
                  {
                    ...active,
                    status: 'archived',
                    archivedAt: timestamp,
                    updatedAt: timestamp,
                  },
                  'The current season could not be archived.',
                );
                await db.seasons.put(archived);
              }
            }
          }

          const season = parseWithSchema(
            seasonEntitySchema,
            {
              id: createId(),
              name: parsed.name,
              holidayDate: parsed.holidayDate,
              budgetMinor: parsed.budgetMinor ?? null,
              status,
              isSample: parsed.isSample ?? false,
              archivedAt: status === 'archived' ? timestamp : null,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
            'The new season is invalid.',
          );

          await db.seasons.add(season);

          if (season.status === 'active') {
            const settings = await readSettings(context);
            const nextSettings = parseWithSchema(
              settingsEntitySchema,
              { ...settings, activeSeasonId: season.id, updatedAt: timestamp },
              'The active season could not be selected.',
            );
            await db.settings.put(nextSettings);
          }

          if (options.copyRecipientsFromId) {
            await copyRecipientsIntoSeason(context, options.copyRecipientsFromId, season.id);
          }

          return season;
        });
      });
    },

    update(id, input) {
      return withStorageErrors(async () => {
        const parsed = parseWithSchema(
          seasonUpdateInputSchema,
          input,
          'The season change is invalid.',
        );

        return db.transaction('rw', db.seasons, async () => {
          const current = await assertWritableSeason(context, id);
          const next = parseWithSchema(
            seasonEntitySchema,
            { ...applyDefined(current, parsed), updatedAt: context.nowIso() },
            'The season change is invalid.',
          );

          await db.seasons.put(next);
          return next;
        });
      });
    },

    archive(id) {
      return withStorageErrors(async () => {
        return db.transaction('rw', db.seasons, db.settings, async () => {
          const season = await readSeason(context, id);

          if (season.status === 'archived') {
            throw new ConflictError('That season is already archived.');
          }

          const timestamp = context.nowIso();
          const archived = parseWithSchema(
            seasonEntitySchema,
            {
              ...season,
              status: 'archived',
              archivedAt: timestamp,
              updatedAt: timestamp,
            },
            'The season could not be archived.',
          );

          await db.seasons.put(archived);

          const settings = await readSettings(context);
          if (settings.activeSeasonId === id) {
            await db.settings.put(
              parseWithSchema(
                settingsEntitySchema,
                { ...settings, activeSeasonId: null, updatedAt: timestamp },
                'The active season could not be cleared.',
              ),
            );
          }

          return archived;
        });
      });
    },

    restore(id) {
      return withStorageErrors(async () => {
        return db.transaction('rw', db.seasons, db.settings, async () => {
          const target = await readSeason(context, id);
          const timestamp = context.nowIso();

          if (target.status === 'active') {
            const settings = await readSettings(context);
            await db.settings.put(
              parseWithSchema(
                settingsEntitySchema,
                { ...settings, activeSeasonId: target.id, updatedAt: timestamp },
                'The active season could not be selected.',
              ),
            );
            return target;
          }

          const activeSeasons = await db.seasons.where('status').equals('active').toArray();

          for (const active of activeSeasons) {
            const archived = parseWithSchema(
              seasonEntitySchema,
              {
                ...active,
                status: 'archived',
                archivedAt: timestamp,
                updatedAt: timestamp,
              },
              'The previous active season could not be archived.',
            );
            await db.seasons.put(archived);
          }

          const restored = parseWithSchema(
            seasonEntitySchema,
            { ...target, status: 'active', archivedAt: null, updatedAt: timestamp },
            'The season could not be restored.',
          );
          await db.seasons.put(restored);

          const settings = await readSettings(context);
          await db.settings.put(
            parseWithSchema(
              settingsEntitySchema,
              { ...settings, activeSeasonId: restored.id, updatedAt: timestamp },
              'The active season could not be selected.',
            ),
          );

          return restored;
        });
      });
    },

    delete(id, confirmationName) {
      return withStorageErrors(async () => {
        return db.transaction(
          'rw',
          db.seasons,
          db.recipients,
          db.gifts,
          db.ideas,
          db.settings,
          async () => {
            const season = await readSeason(context, id);

            if (season.status !== 'archived') {
              throw new ConflictError(
                'Only an archived season can be deleted.',
                'Archive the season first, then delete it deliberately.',
              );
            }

            if (confirmationName.trim() !== season.name) {
              throw new ValidationError('Type the season name exactly to delete it.', [
                {
                  path: 'confirmationName',
                  message: 'The confirmation does not match the season name.',
                },
              ]);
            }

            await db.gifts.where('seasonId').equals(id).delete();
            await db.ideas.where('seasonId').equals(id).delete();
            await db.recipients.where('seasonId').equals(id).delete();
            await db.seasons.delete(id);

            const settings = await readSettings(context);
            if (settings.activeSeasonId === id) {
              await db.settings.put(
                parseWithSchema(
                  settingsEntitySchema,
                  { ...settings, activeSeasonId: null, updatedAt: context.nowIso() },
                  'The active season could not be cleared.',
                ),
              );
            }
          },
        );
      });
    },

    copyRecipients(fromId, toId) {
      return withStorageErrors(async () => {
        return db.transaction('rw', db.seasons, db.recipients, async () => {
          await assertWritableSeason(context, toId);
          return copyRecipientsIntoSeason(context, fromId, toId);
        });
      });
    },
  };
}
