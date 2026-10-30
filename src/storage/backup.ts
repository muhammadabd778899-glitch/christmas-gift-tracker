import { z } from 'zod';
import type { AppSettings, Gift, Idea, Recipient, Season, Timestamp } from '../domain/entities';
import { ExportError, ImportError, ValidationError } from '../domain/errors';
import {
  giftEntitySchema,
  ideaEntitySchema,
  parseWithSchema,
  recipientEntitySchema,
  seasonEntitySchema,
  settingsEntitySchema,
  timestampSchema,
} from '../domain/schemas';
import { createId } from '../lib/ids';
import type { MetaRecord } from '../domain/entities';
import { SCHEMA_VERSION } from './db';
import { withStorageErrors } from './errors';
import type { RepositoryContext } from './repositories/context';

export const BACKUP_FORMAT = 'christmas-gift-tracker-backup';
export const BACKUP_FORMAT_VERSION = 1;
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

const MAX_SEASONS = 500;
const MAX_RECIPIENTS_PER_SEASON = 10_000;
const MAX_GIFTS_PER_SEASON = 10_000;
const MAX_IDEAS_PER_SEASON = 10_000;
const MAX_REPORTED_ISSUES = 8;

export interface BackupData {
  settings: AppSettings;
  seasons: Season[];
  recipients: Recipient[];
  gifts: Gift[];
  ideas: Idea[];
}

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  schemaVersion: number;
  appVersion: string;
  exportedAt: Timestamp;
  data: BackupData;
}

export interface BackupSummary {
  seasons: number;
  activeSeasons: number;
  archivedSeasons: number;
  sampleSeasons: number;
  recipients: number;
  gifts: number;
  ideas: number;
  exportedAt: Timestamp;
  schemaVersion: number;
  appVersion: string;
}

export interface BackupExport {
  filename: string;
  content: string;
  summary: BackupSummary;
}

export interface ValidatedBackup {
  envelope: BackupEnvelope;
  summary: BackupSummary;
}

export interface BackupSource {
  readonly name?: string;
  readonly size: number;
  text(): Promise<string>;
}

export interface RestoreBackupOptions {
  confirmation: string;
}

export interface RestoreBackupResult {
  summary: BackupSummary;
}

const backupEnvelopeSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.number().int().min(1),
  schemaVersion: z.number().int().min(1),
  appVersion: z.string().trim().min(1).max(40),
  exportedAt: timestampSchema,
  data: z.object({
    settings: settingsEntitySchema,
    seasons: z.array(seasonEntitySchema).max(MAX_SEASONS),
    recipients: z.array(recipientEntitySchema),
    gifts: z.array(giftEntitySchema),
    ideas: z.array(ideaEntitySchema),
  }),
});

function summarize(envelope: BackupEnvelope): BackupSummary {
  const activeSeasons = envelope.data.seasons.filter((season) => season.status === 'active');

  return {
    seasons: envelope.data.seasons.length,
    activeSeasons: activeSeasons.length,
    archivedSeasons: envelope.data.seasons.length - activeSeasons.length,
    sampleSeasons: envelope.data.seasons.filter((season) => season.isSample).length,
    recipients: envelope.data.recipients.length,
    gifts: envelope.data.gifts.length,
    ideas: envelope.data.ideas.length,
    exportedAt: envelope.exportedAt,
    schemaVersion: envelope.schemaVersion,
    appVersion: envelope.appVersion,
  };
}

function issueList(issues: string[]): string {
  const shown = issues.slice(0, MAX_REPORTED_ISSUES).join(' ');
  const remaining = issues.length - MAX_REPORTED_ISSUES;

  return remaining > 0 ? `${shown} (+${remaining} more)` : shown;
}

function validateRelations(envelope: BackupEnvelope): string[] {
  const { settings, seasons, recipients, gifts, ideas } = envelope.data;
  const issues: string[] = [];
  const seenIds = new Map<string, string>();
  const seasonsById = new Map(seasons.map((season) => [season.id, season]));
  const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
  const giftsById = new Map(gifts.map((gift) => [gift.id, gift]));
  const ideasById = new Map(ideas.map((idea) => [idea.id, idea]));

  const register = (id: string, label: string) => {
    const existing = seenIds.get(id);
    if (existing) {
      issues.push(`The identifier ${id} is used by both ${existing} and ${label}.`);
    } else {
      seenIds.set(id, label);
    }
  };

  for (const season of seasons) register(season.id, `season "${season.name}"`);
  for (const recipient of recipients) register(recipient.id, `recipient "${recipient.name}"`);
  for (const gift of gifts) register(gift.id, `gift "${gift.name}"`);
  for (const idea of ideas) register(idea.id, `idea "${idea.name}"`);

  const activeSeasons = seasons.filter((season) => season.status === 'active');
  if (activeSeasons.length > 1) {
    issues.push('The backup contains more than one active season.');
  }

  if (settings.activeSeasonId !== null) {
    const active = seasonsById.get(settings.activeSeasonId);
    if (!active) {
      issues.push('The settings point to a season that is not in the backup.');
    } else if (active.status !== 'active') {
      issues.push('The settings point to a season that is not active.');
    }
  }

  const recipientCounts = new Map<string, number>();
  const giftCounts = new Map<string, number>();
  const ideaCounts = new Map<string, number>();
  const countFor = (map: Map<string, number>, id: string) => {
    const next = (map.get(id) ?? 0) + 1;
    map.set(id, next);
    return next;
  };

  for (const recipient of recipients) {
    if (!seasonsById.has(recipient.seasonId)) {
      issues.push(`Recipient "${recipient.name}" belongs to a missing season.`);
    }
    if (countFor(recipientCounts, recipient.seasonId) > MAX_RECIPIENTS_PER_SEASON) {
      issues.push(`A season has more than ${MAX_RECIPIENTS_PER_SEASON} recipients.`);
    }
  }

  for (const gift of gifts) {
    if (!seasonsById.has(gift.seasonId)) {
      issues.push(`Gift "${gift.name}" belongs to a missing season.`);
      continue;
    }

    const recipient = recipientsById.get(gift.recipientId);
    if (!recipient) {
      issues.push(`Gift "${gift.name}" belongs to a missing recipient.`);
    } else if (recipient.seasonId !== gift.seasonId) {
      issues.push(`Gift "${gift.name}" points to a recipient in a different season.`);
    }

    if (gift.sourceIdeaId !== undefined) {
      const idea = ideasById.get(gift.sourceIdeaId);
      if (!idea) {
        issues.push(`Gift "${gift.name}" points to a missing idea.`);
      } else if (idea.convertedGiftId !== gift.id || idea.seasonId !== gift.seasonId) {
        issues.push(`Gift "${gift.name}" and its source idea do not agree.`);
      }
    }

    if (countFor(giftCounts, gift.seasonId) > MAX_GIFTS_PER_SEASON) {
      issues.push(`A season has more than ${MAX_GIFTS_PER_SEASON} gifts.`);
    }
  }

  for (const idea of ideas) {
    if (!seasonsById.has(idea.seasonId)) {
      issues.push(`Idea "${idea.name}" belongs to a missing season.`);
    }

    if (idea.recipientId !== null) {
      const recipient = recipientsById.get(idea.recipientId);
      if (!recipient) {
        issues.push(`Idea "${idea.name}" points to a missing recipient.`);
      } else if (recipient.seasonId !== idea.seasonId) {
        issues.push(`Idea "${idea.name}" points to a recipient in a different season.`);
      }
    }

    if (idea.convertedGiftId !== null) {
      const gift = giftsById.get(idea.convertedGiftId);
      if (!gift) {
        issues.push(`Idea "${idea.name}" points to a missing gift.`);
      } else if (gift.sourceIdeaId !== idea.id || gift.seasonId !== idea.seasonId) {
        issues.push(`Idea "${idea.name}" and its converted gift do not agree.`);
      }
    }

    if (countFor(ideaCounts, idea.seasonId) > MAX_IDEAS_PER_SEASON) {
      issues.push(`A season has more than ${MAX_IDEAS_PER_SEASON} ideas.`);
    }
  }

  return issues;
}

export async function validateBackup(source: BackupSource): Promise<ValidatedBackup> {
  if (typeof source?.text !== 'function' || typeof source.size !== 'number') {
    throw new ImportError('Choose a backup file to continue.');
  }

  if (source.size > MAX_BACKUP_BYTES) {
    throw new ImportError(
      'That backup file is larger than the 25 MB limit. Choose the original export instead of an edited copy.',
    );
  }

  let text: string;
  try {
    text = await source.text();
  } catch (error) {
    throw new ImportError('That file could not be read. Choose it again.', { cause: error });
  }

  if (text.trim().length === 0) {
    throw new ImportError('That file is empty. Choose a Christmas Gift Tracker backup.');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new ImportError(
      'That file is not valid JSON. Choose an unedited backup exported by this app.',
      { cause: error },
    );
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new ImportError('That file is not a Christmas Gift Tracker backup.');
  }

  const candidate = raw as Record<string, unknown>;

  if (candidate.format !== BACKUP_FORMAT) {
    throw new ImportError(
      'That file is not a Christmas Gift Tracker backup. Its format marker is missing or different.',
    );
  }

  if (candidate.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new ImportError(
      `This backup uses format version ${String(candidate.formatVersion)}. This build supports format version ${BACKUP_FORMAT_VERSION}.`,
    );
  }

  if (typeof candidate.schemaVersion !== 'number' || !Number.isInteger(candidate.schemaVersion)) {
    throw new ImportError('That backup does not declare a valid schema version.');
  }

  if (candidate.schemaVersion > SCHEMA_VERSION) {
    throw new ImportError(
      `This backup was created by a newer version of the planner (schema ${candidate.schemaVersion}). Update the app before restoring it.`,
    );
  }

  if (candidate.schemaVersion < SCHEMA_VERSION) {
    throw new ImportError(
      `This backup uses schema version ${candidate.schemaVersion}. No safe migration to schema ${SCHEMA_VERSION} exists in this build, so it cannot be restored.`,
    );
  }

  const result = backupEnvelopeSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'backup';
      return `${path}: ${issue.message}`;
    });
    throw new ImportError(
      `The backup contains invalid records. Nothing was imported. ${issueList(issues)}`,
    );
  }

  const envelope = result.data as BackupEnvelope;
  const relationIssues = validateRelations(envelope);

  if (relationIssues.length > 0) {
    throw new ImportError(
      `The backup failed its consistency checks. Nothing was imported. ${issueList(relationIssues)}`,
    );
  }

  return { envelope, summary: summarize(envelope) };
}

export async function createBackup(context: RepositoryContext): Promise<BackupExport> {
  return withStorageErrors(async () => {
    try {
      const [settings, seasons, recipients, gifts, ideas] = await Promise.all([
        context.db.settings.get('app'),
        context.db.seasons.toArray(),
        context.db.recipients.toArray(),
        context.db.gifts.toArray(),
        context.db.ideas.toArray(),
      ]);

      if (!settings) {
        throw new ExportError('The app settings are missing, so a complete backup was not made.');
      }

      const data: BackupData = {
        settings: parseWithSchema(
          settingsEntitySchema,
          settings,
          'The saved settings are invalid.',
        ),
        seasons: seasons.map((season) =>
          parseWithSchema(seasonEntitySchema, season, 'A saved season is invalid.'),
        ),
        recipients: recipients.map((recipient) =>
          parseWithSchema(recipientEntitySchema, recipient, 'A saved recipient is invalid.'),
        ),
        gifts: gifts.map((gift) =>
          parseWithSchema(giftEntitySchema, gift, 'A saved gift is invalid.'),
        ),
        ideas: ideas.map((idea) =>
          parseWithSchema(ideaEntitySchema, idea, 'A saved idea is invalid.'),
        ),
      };

      const envelope: BackupEnvelope = {
        format: BACKUP_FORMAT,
        formatVersion: BACKUP_FORMAT_VERSION,
        schemaVersion: context.db.verno,
        appVersion: context.appVersion,
        exportedAt: context.nowIso(),
        data,
      };

      const relationIssues = validateRelations(envelope);

      if (relationIssues.length > 0) {
        throw new ExportError(
          `Some saved records disagree with each other, so a complete backup was not made. ${issueList(relationIssues)}`,
        );
      }

      return {
        filename: `christmas-gift-tracker-backup-${envelope.exportedAt.slice(0, 10)}.json`,
        content: `${JSON.stringify(envelope, null, 2)}\n`,
        summary: summarize(envelope),
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ExportError(
          'Some saved records are invalid, so a complete backup was not made. Your data was not changed.',
          { cause: error },
        );
      }
      throw error;
    }
  });
}

export async function restoreBackup(
  context: RepositoryContext,
  source: BackupSource,
  options: RestoreBackupOptions,
): Promise<RestoreBackupResult> {
  const { envelope, summary } = await validateBackup(source);

  if (options.confirmation.trim() !== 'RESTORE') {
    throw new ValidationError('Type RESTORE to replace the data on this device.', [
      {
        path: 'confirmation',
        message: 'The restore confirmation must be exactly RESTORE.',
      },
    ]);
  }

  return withStorageErrors(async () => {
    const { db } = context;

    return db.transaction(
      'rw',
      [db.settings, db.seasons, db.recipients, db.gifts, db.ideas, db.meta],
      async () => {
        const timestamp = context.nowIso();
        const existingDatabaseId = await db.meta.get('databaseId');
        const databaseId =
          existingDatabaseId && typeof existingDatabaseId.value === 'string'
            ? existingDatabaseId.value
            : createId();

        await Promise.all([
          db.settings.clear(),
          db.seasons.clear(),
          db.recipients.clear(),
          db.gifts.clear(),
          db.ideas.clear(),
        ]);

        await db.settings.add(envelope.data.settings);

        if (envelope.data.seasons.length > 0) {
          await db.seasons.bulkAdd(envelope.data.seasons);
        }
        if (envelope.data.recipients.length > 0) {
          await db.recipients.bulkAdd(envelope.data.recipients);
        }
        if (envelope.data.gifts.length > 0) {
          await db.gifts.bulkAdd(envelope.data.gifts);
        }
        if (envelope.data.ideas.length > 0) {
          await db.ideas.bulkAdd(envelope.data.ideas);
        }

        const meta: MetaRecord[] = [
          { key: 'databaseId', value: databaseId, updatedAt: timestamp },
          { key: 'schemaVersion', value: db.verno, updatedAt: timestamp },
          { key: 'appVersion', value: context.appVersion, updatedAt: timestamp },
        ];
        await db.meta.bulkPut(meta);

        return { summary };
      },
    );
  });
}
