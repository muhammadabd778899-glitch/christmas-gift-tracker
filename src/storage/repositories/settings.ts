import type { AppSettings, SeasonId } from '../../domain/entities';
import { ConflictError, NotFoundError } from '../../domain/errors';
import {
  parseWithSchema,
  seasonEntitySchema,
  settingsEntitySchema,
  settingsUpdateInputSchema,
} from '../../domain/schemas';
import { withStorageErrors } from '../errors';
import { recordLocalChange } from '../changeTracking';
import { applyDefined, readSettings, type RepositoryContext } from './context';

export interface SettingsRepository {
  get(): Promise<AppSettings>;
  update(patch: unknown): Promise<AppSettings>;
  setActiveSeason(seasonId: SeasonId | null): Promise<AppSettings>;
}

export function createSettingsRepository(context: RepositoryContext): SettingsRepository {
  const { db } = context;

  return {
    get() {
      return withStorageErrors(() => readSettings(context));
    },

    update(patch) {
      return withStorageErrors(async () => {
        const parsedPatch = parseWithSchema(
          settingsUpdateInputSchema,
          patch,
          'The settings change is invalid.',
        );

        return db.transaction(
          'rw',
          db.settings,
          db.seasons,
          db.syncOutbox,
          db.syncTombstones,
          async () => {
            const current = await readSettings(context);
            const timestamp = context.nowIso();
            const next = parseWithSchema(
              settingsEntitySchema,
              {
                ...applyDefined(current, parsedPatch),
                updatedAt: timestamp,
              },
              'The settings change is invalid.',
            );

            if (next.activeSeasonId !== null) {
              const season = await db.seasons.get(next.activeSeasonId);

              if (!season) {
                throw new NotFoundError('Season', next.activeSeasonId);
              }

              parseWithSchema(seasonEntitySchema, season, 'The selected season is invalid.');

              if (season.status !== 'active') {
                throw new ConflictError(
                  'Only an active season can be selected.',
                  'Restore the season before making it active.',
                );
              }
            }

            await db.settings.put(next);
            await recordLocalChange(db, {
              entityType: 'settings',
              entityId: 'app',
              operation: 'upsert',
              at: timestamp,
            });
            return next;
          },
        );
      });
    },

    setActiveSeason(seasonId) {
      return withStorageErrors(async () => {
        return db.transaction(
          'rw',
          db.settings,
          db.seasons,
          db.syncOutbox,
          db.syncTombstones,
          async () => {
            const current = await readSettings(context);

            if (seasonId !== null) {
              const season = await db.seasons.get(seasonId);

              if (!season) {
                throw new NotFoundError('Season', seasonId);
              }

              parseWithSchema(seasonEntitySchema, season, 'The selected season is invalid.');

              if (season.status !== 'active') {
                throw new ConflictError(
                  'Only an active season can be selected.',
                  'Restore the season before making it active.',
                );
              }
            }

            const timestamp = context.nowIso();
            const next = parseWithSchema(
              settingsEntitySchema,
              { ...current, activeSeasonId: seasonId, updatedAt: timestamp },
              'The active season could not be saved.',
            );

            await db.settings.put(next);
            await recordLocalChange(db, {
              entityType: 'settings',
              entityId: 'app',
              operation: 'upsert',
              at: timestamp,
            });
            return next;
          },
        );
      });
    },
  };
}
