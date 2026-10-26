import type { AppSettings, MetaRecord, Timestamp } from '../domain/entities';
import { timestampNow } from '../domain/dates';
import { MigrationError, isAppError } from '../domain/errors';
import { metaRecordSchema, parseWithSchema, settingsEntitySchema } from '../domain/schemas';
import { createId } from '../lib/ids';
import { createDefaultSettings, createMetaRecords } from './defaults';
import { createDatabase, type GiftTrackerDatabase } from './db';
import { mapStorageError } from './errors';

const DATABASE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface InitializeStorageOptions {
  appVersion: string;
  locale?: string | null;
  now?: () => Date;
  db?: GiftTrackerDatabase;
}

export interface InitializedStorage {
  db: GiftTrackerDatabase;
  settings: AppSettings;
  openedAt: Timestamp;
}

async function readOrCreateSettings(
  db: GiftTrackerDatabase,
  locale: string | null | undefined,
  now: Date,
): Promise<AppSettings> {
  const existing = await db.settings.get('app');

  if (existing) {
    try {
      return parseWithSchema(
        settingsEntitySchema,
        existing,
        'The saved settings could not be read safely.',
      );
    } catch (error) {
      throw new MigrationError(
        'The saved settings could not be read safely. Existing settings were not overwritten.',
        {
          cause: error,
          recovery:
            'Your data has not been deleted. Restore a backup or contact support before clearing site data.',
        },
      );
    }
  }

  const settings = createDefaultSettings({ locale, now });
  parseWithSchema(settingsEntitySchema, settings, 'The default settings were invalid.');
  await db.settings.add(settings);
  return settings;
}

async function readDatabaseId(db: GiftTrackerDatabase): Promise<string> {
  const existing = await db.meta.get('databaseId');

  if (!existing) {
    return createId();
  }

  parseWithSchema(metaRecordSchema, existing, 'The database identity record is invalid.');

  if (typeof existing.value !== 'string' || !DATABASE_ID_PATTERN.test(existing.value)) {
    throw new MigrationError('The database identity record is invalid. It was not replaced.', {
      recovery:
        'Your data has not been deleted. Restore a backup or contact support before clearing site data.',
    });
  }

  return existing.value;
}

export async function initializeStorage(
  options: InitializeStorageOptions,
): Promise<InitializedStorage> {
  const db = options.db ?? createDatabase();
  const clock = options.now ?? (() => new Date());
  const openedAt = timestampNow(clock());

  try {
    await db.open();
  } catch (error) {
    throw mapStorageError(error);
  }

  try {
    const settings = await readOrCreateSettings(db, options.locale, clock());
    const databaseId = await readDatabaseId(db);

    const meta: MetaRecord[] = createMetaRecords({
      databaseId,
      appVersion: options.appVersion,
      schemaVersion: db.verno,
      now: clock(),
    });

    for (const record of meta) {
      parseWithSchema(metaRecordSchema, record, 'A database diagnostics record is invalid.');
    }

    await db.meta.bulkPut(meta);

    return { db, settings, openedAt };
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    throw mapStorageError(error);
  }
}
