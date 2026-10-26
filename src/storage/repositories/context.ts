import type {
  AppSettings,
  Gift,
  GiftId,
  Recipient,
  RecipientId,
  Season,
  SeasonId,
  Timestamp,
} from '../../domain/entities';
import { timestampNow } from '../../domain/dates';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/errors';
import { normalizeLocale } from '../../domain/locale';
import { APP_VERSION } from '../../lib/appInfo';
import {
  giftEntitySchema,
  parseWithSchema,
  recipientEntitySchema,
  seasonEntitySchema,
  settingsEntitySchema,
} from '../../domain/schemas';
import type { GiftTrackerDatabase } from '../db';

export interface RepositoryOptions {
  now?: () => Date;
  locale?: string | null;
  appVersion?: string;
}

export interface RepositoryContext {
  db: GiftTrackerDatabase;
  now: () => Date;
  nowIso: () => Timestamp;
  locale: string;
  appVersion: string;
}

export function createRepositoryContext(
  db: GiftTrackerDatabase,
  options: RepositoryOptions = {},
): RepositoryContext {
  const now = options.now ?? (() => new Date());

  return {
    db,
    now,
    nowIso: () => timestampNow(now()),
    locale: normalizeLocale(options.locale),
    appVersion: options.appVersion ?? APP_VERSION,
  };
}

export function applyDefined<T extends object>(target: T, patch: Partial<T>): T {
  const next = { ...target } as Record<string, unknown>;

  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      next[key] = value;
    }
  }

  return next as T;
}

export async function readSeason(context: RepositoryContext, seasonId: SeasonId): Promise<Season> {
  const season = await context.db.seasons.get(seasonId);

  if (!season) {
    throw new NotFoundError('Season', seasonId);
  }

  return parseWithSchema(seasonEntitySchema, season, 'The saved season is invalid.');
}

export async function assertWritableSeason(
  context: RepositoryContext,
  seasonId: SeasonId,
): Promise<Season> {
  const season = await readSeason(context, seasonId);

  if (season.status === 'archived') {
    throw new ConflictError(
      'This season is archived and read-only.',
      'Restore the season before editing its recipients, gifts, or ideas.',
    );
  }

  return season;
}

export async function readRecipient(
  context: RepositoryContext,
  recipientId: RecipientId,
): Promise<Recipient> {
  const recipient = await context.db.recipients.get(recipientId);

  if (!recipient) {
    throw new NotFoundError('Recipient', recipientId);
  }

  return parseWithSchema(recipientEntitySchema, recipient, 'The saved recipient is invalid.');
}

export async function assertRecipientInSeason(
  context: RepositoryContext,
  recipientId: RecipientId,
  seasonId: SeasonId,
): Promise<Recipient> {
  const recipient = await readRecipient(context, recipientId);

  if (recipient.seasonId !== seasonId) {
    throw new ValidationError('That recipient belongs to a different season.', [
      { path: 'recipientId', message: 'Choose a recipient in this season.' },
    ]);
  }

  return recipient;
}

export async function readSettings(context: RepositoryContext): Promise<AppSettings> {
  const settings = await context.db.settings.get('app');

  if (!settings) {
    throw new NotFoundError('Settings', 'app');
  }

  return parseWithSchema(settingsEntitySchema, settings, 'The saved settings are invalid.');
}

export async function readGift(context: RepositoryContext, giftId: GiftId): Promise<Gift> {
  const gift = await context.db.gifts.get(giftId);

  if (!gift) {
    throw new NotFoundError('Gift', giftId);
  }

  return parseWithSchema(giftEntitySchema, gift, 'The saved gift is invalid.');
}

export function nowTimestamp(context: RepositoryContext): Timestamp {
  return context.nowIso();
}
