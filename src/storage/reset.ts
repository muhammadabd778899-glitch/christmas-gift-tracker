import type { AppSettings, MetaRecord } from '../domain/entities';
import { ValidationError } from '../domain/errors';
import { metaRecordSchema, parseWithSchema, settingsEntitySchema } from '../domain/schemas';
import { createId } from '../lib/ids';
import { createDefaultSettings, createMetaRecords } from './defaults';
import { withStorageErrors } from './errors';
import type { RepositoryContext } from './repositories/context';

export interface ResetAllDataOptions {
  confirmation: string;
}

export interface ResetAllDataResult {
  settings: AppSettings;
}

export async function resetAllData(
  context: RepositoryContext,
  options: ResetAllDataOptions,
): Promise<ResetAllDataResult> {
  return withStorageErrors(async () => {
    if (options.confirmation.trim() !== 'DELETE') {
      throw new ValidationError('Type DELETE to clear all planner data.', [
        {
          path: 'confirmation',
          message: 'The reset confirmation must be exactly DELETE.',
        },
      ]);
    }

    const { db } = context;

    return db.transaction(
      'rw',
      [db.settings, db.seasons, db.recipients, db.gifts, db.ideas, db.meta],
      async () => {
        const existingDatabaseId = await db.meta.get('databaseId');
        const databaseId =
          existingDatabaseId && typeof existingDatabaseId.value === 'string'
            ? existingDatabaseId.value
            : createId();
        const now = context.now();
        const settings = createDefaultSettings({ locale: context.locale, now });

        await Promise.all([
          db.settings.clear(),
          db.seasons.clear(),
          db.recipients.clear(),
          db.gifts.clear(),
          db.ideas.clear(),
          db.meta.clear(),
        ]);

        const meta: MetaRecord[] = createMetaRecords({
          databaseId,
          appVersion: context.appVersion,
          schemaVersion: db.verno,
          now,
        });

        for (const record of meta) {
          parseWithSchema(metaRecordSchema, record, 'A diagnostics record is invalid.');
        }

        await db.meta.bulkPut(meta);
        const validatedSettings = parseWithSchema(
          settingsEntitySchema,
          settings,
          'The reset settings were invalid.',
        );
        await db.settings.add(validatedSettings);

        return { settings: validatedSettings };
      },
    );
  });
}
