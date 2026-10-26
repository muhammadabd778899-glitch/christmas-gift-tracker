import type { AppSettings, Gift, Idea, Recipient, Season } from '../domain/entities';
import {
  giftEntitySchema,
  ideaEntitySchema,
  recipientEntitySchema,
  seasonEntitySchema,
  settingsEntitySchema,
} from '../domain/schemas';
import { SCHEMA_VERSION, type GiftTrackerDatabase } from './db';

export type HealthSeverity = 'info' | 'warning' | 'error';

export type HealthIssueCode =
  | 'DATABASE_VERSION_MISMATCH'
  | 'SETTINGS_MISSING'
  | 'INVALID_RECORD'
  | 'MULTIPLE_ACTIVE_SEASONS'
  | 'ACTIVE_SEASON_INVALID'
  | 'ACTIVE_SEASON_NOT_SELECTED'
  | 'SEASON_STATUS_MISMATCH'
  | 'ORPHAN_RECORD'
  | 'GIFT_RECIPIENT_MISSING'
  | 'GIFT_RECIPIENT_SEASON_MISMATCH'
  | 'GIFT_SOURCE_IDEA_MISSING'
  | 'IDEA_RECIPIENT_MISSING'
  | 'IDEA_RECIPIENT_SEASON_MISMATCH'
  | 'IDEA_GIFT_MISSING'
  | 'IDEA_GIFT_SEASON_MISMATCH'
  | 'IDEA_STATUS_MISMATCH'
  | 'DUPLICATE_SOURCE_IDEA'
  | 'GIFT_STATUS_INVARIANT'
  | 'GIFT_DATE_FLAG_MISMATCH';

export interface HealthIssue {
  code: HealthIssueCode;
  severity: HealthSeverity;
  message: string;
  recordIds?: string[];
}

export interface StorageHealth {
  ok: boolean;
  databaseVersion: number;
  storage: {
    usageBytes: number | null;
    quotaBytes: number | null;
    persisted: boolean | null;
  };
  counts: {
    seasons: number;
    activeSeasons: number;
    archivedSeasons: number;
    recipients: number;
    gifts: number;
    ideas: number;
  };
  issues: HealthIssue[];
}

interface StorageInfo {
  usageBytes: number | null;
  quotaBytes: number | null;
  persisted: boolean | null;
}

async function readStorageInfo(): Promise<StorageInfo> {
  const storage =
    typeof navigator === 'undefined'
      ? undefined
      : (navigator.storage as StorageManager | undefined);

  if (!storage) {
    return { usageBytes: null, quotaBytes: null, persisted: null };
  }

  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  let persisted: boolean | null = null;

  try {
    const estimate = await storage.estimate?.();
    usageBytes = typeof estimate?.usage === 'number' ? estimate.usage : null;
    quotaBytes = typeof estimate?.quota === 'number' ? estimate.quota : null;
  } catch {
    usageBytes = null;
    quotaBytes = null;
  }

  try {
    persisted = typeof storage.persisted === 'function' ? await storage.persisted() : null;
  } catch {
    persisted = null;
  }

  return { usageBytes, quotaBytes, persisted };
}

function invalidRecordIssue(entity: string, recordId: string): HealthIssue {
  return {
    code: 'INVALID_RECORD',
    severity: 'error',
    message: `A saved ${entity} record does not match the data model.`,
    recordIds: [recordId],
  };
}

function settingsAreValid(settings: AppSettings): boolean {
  return settingsEntitySchema.safeParse(settings).success;
}

export async function healthCheck(db: GiftTrackerDatabase): Promise<StorageHealth> {
  const [seasons, recipients, gifts, ideas, settings, storageInfo] = await Promise.all([
    db.seasons.toArray() as Promise<Season[]>,
    db.recipients.toArray() as Promise<Recipient[]>,
    db.gifts.toArray() as Promise<Gift[]>,
    db.ideas.toArray() as Promise<Idea[]>,
    db.settings.get('app') as Promise<AppSettings | undefined>,
    readStorageInfo(),
  ]);

  const issues: HealthIssue[] = [];
  const seasonIds = new Set<string>(seasons.map((season) => season.id));
  const ideaIds = new Set<string>(ideas.map((idea) => idea.id));
  const recipientById = new Map<string, Recipient>(
    recipients.map((recipient) => [recipient.id, recipient]),
  );
  const giftById = new Map<string, Gift>(gifts.map((gift) => [gift.id, gift]));
  const activeSeasons = seasons.filter((season) => season.status === 'active');
  const archivedSeasons = seasons.filter((season) => season.status === 'archived');

  if (db.verno !== SCHEMA_VERSION) {
    issues.push({
      code: 'DATABASE_VERSION_MISMATCH',
      severity: 'error',
      message: 'The local database version does not match the supported version.',
    });
  }

  for (const season of seasons) {
    if (!seasonEntitySchema.safeParse(season).success) {
      issues.push(invalidRecordIssue('season', season.id));
    }

    const statusAgrees =
      (season.status === 'active' && season.archivedAt === null) ||
      (season.status === 'archived' && season.archivedAt !== null);

    if (!statusAgrees) {
      issues.push({
        code: 'SEASON_STATUS_MISMATCH',
        severity: 'error',
        message: 'A season status and archive time disagree.',
        recordIds: [season.id],
      });
    }
  }

  for (const recipient of recipients) {
    if (!recipientEntitySchema.safeParse(recipient).success) {
      issues.push(invalidRecordIssue('recipient', recipient.id));
    }

    if (!seasonIds.has(recipient.seasonId)) {
      issues.push({
        code: 'ORPHAN_RECORD',
        severity: 'error',
        message: 'A recipient points to a season that no longer exists.',
        recordIds: [recipient.id],
      });
    }
  }

  for (const gift of gifts) {
    if (!giftEntitySchema.safeParse(gift).success) {
      issues.push(invalidRecordIssue('gift', gift.id));
    }

    if (!seasonIds.has(gift.seasonId)) {
      issues.push({
        code: 'ORPHAN_RECORD',
        severity: 'error',
        message: 'A gift points to a season that no longer exists.',
        recordIds: [gift.id],
      });
    }

    const recipient = recipientById.get(gift.recipientId);
    if (!recipient) {
      issues.push({
        code: 'GIFT_RECIPIENT_MISSING',
        severity: 'error',
        message: 'A gift points to a recipient that no longer exists.',
        recordIds: [gift.id],
      });
    } else if (recipient.seasonId !== gift.seasonId) {
      issues.push({
        code: 'GIFT_RECIPIENT_SEASON_MISMATCH',
        severity: 'error',
        message: 'A gift and its recipient belong to different seasons.',
        recordIds: [gift.id, recipient.id],
      });
    }

    if ((gift.wrapped && !gift.bought) || (gift.sent && !gift.bought)) {
      issues.push({
        code: 'GIFT_STATUS_INVARIANT',
        severity: 'error',
        message: 'A gift is wrapped or sent without being marked bought.',
        recordIds: [gift.id],
      });
    }

    if (gift.sourceIdeaId && !ideaIds.has(gift.sourceIdeaId)) {
      issues.push({
        code: 'GIFT_SOURCE_IDEA_MISSING',
        severity: 'error',
        message: 'A gift points to an idea that no longer exists.',
        recordIds: [gift.id],
      });
    }

    const datesAgree =
      (gift.bought || gift.boughtOn === null) &&
      (gift.wrapped || gift.wrappedOn === null) &&
      (gift.sent || gift.sentOn === null);

    if (!datesAgree) {
      issues.push({
        code: 'GIFT_DATE_FLAG_MISMATCH',
        severity: 'error',
        message: 'A gift status date is set while its status is off.',
        recordIds: [gift.id],
      });
    }
  }

  const sourceIdeaIds = new Map<string, string[]>();
  for (const gift of gifts) {
    if (gift.sourceIdeaId) {
      const existing = sourceIdeaIds.get(gift.sourceIdeaId) ?? [];
      existing.push(gift.id);
      sourceIdeaIds.set(gift.sourceIdeaId, existing);
    }
  }

  for (const [ideaId, giftIds] of sourceIdeaIds) {
    if (giftIds.length > 1) {
      issues.push({
        code: 'DUPLICATE_SOURCE_IDEA',
        severity: 'error',
        message: 'More than one gift points to the same idea.',
        recordIds: [ideaId, ...giftIds],
      });
    }
  }

  for (const idea of ideas) {
    if (!ideaEntitySchema.safeParse(idea).success) {
      issues.push(invalidRecordIssue('idea', idea.id));
    }

    if (!seasonIds.has(idea.seasonId)) {
      issues.push({
        code: 'ORPHAN_RECORD',
        severity: 'error',
        message: 'An idea points to a season that no longer exists.',
        recordIds: [idea.id],
      });
    }

    if (idea.recipientId) {
      const recipient = recipientById.get(idea.recipientId);
      if (!recipient) {
        issues.push({
          code: 'IDEA_RECIPIENT_MISSING',
          severity: 'error',
          message: 'An idea points to a recipient that no longer exists.',
          recordIds: [idea.id],
        });
      } else if (recipient.seasonId !== idea.seasonId) {
        issues.push({
          code: 'IDEA_RECIPIENT_SEASON_MISMATCH',
          severity: 'error',
          message: 'An idea and its recipient belong to different seasons.',
          recordIds: [idea.id, recipient.id],
        });
      }
    }

    if (idea.convertedGiftId) {
      const gift = giftById.get(idea.convertedGiftId);
      if (!gift) {
        issues.push({
          code: 'IDEA_GIFT_MISSING',
          severity: 'error',
          message: 'A converted idea points to a gift that no longer exists.',
          recordIds: [idea.id],
        });
      } else if (gift.seasonId !== idea.seasonId) {
        issues.push({
          code: 'IDEA_GIFT_SEASON_MISMATCH',
          severity: 'error',
          message: 'A converted idea and its gift belong to different seasons.',
          recordIds: [idea.id, gift.id],
        });
      }
    }

    const statusAgrees =
      (idea.status === 'active' && idea.convertedGiftId === null && idea.convertedAt === null) ||
      (idea.status === 'converted' && idea.convertedGiftId !== null && idea.convertedAt !== null);

    if (!statusAgrees) {
      issues.push({
        code: 'IDEA_STATUS_MISMATCH',
        severity: 'error',
        message: 'An idea status and its conversion fields disagree.',
        recordIds: [idea.id],
      });
    }
  }

  if (activeSeasons.length > 1) {
    issues.push({
      code: 'MULTIPLE_ACTIVE_SEASONS',
      severity: 'error',
      message: 'More than one season is marked active.',
      recordIds: activeSeasons.map((season) => season.id),
    });
  }

  if (!settings) {
    issues.push({
      code: 'SETTINGS_MISSING',
      severity: 'error',
      message: 'The settings singleton is missing.',
    });
  } else {
    if (!settingsAreValid(settings)) {
      issues.push({
        code: 'INVALID_RECORD',
        severity: 'error',
        message: 'The settings record does not match the data model.',
        recordIds: ['app'],
      });
    }

    if (settings.activeSeasonId !== null) {
      const selected = seasons.find((season) => season.id === settings.activeSeasonId);

      if (!selected || selected.status !== 'active') {
        issues.push({
          code: 'ACTIVE_SEASON_INVALID',
          severity: 'error',
          message: 'The selected active season is missing or archived.',
          recordIds: [settings.activeSeasonId],
        });
      }
    } else if (activeSeasons.length > 0) {
      issues.push({
        code: 'ACTIVE_SEASON_NOT_SELECTED',
        severity: 'warning',
        message: 'An active season exists but no active season is selected in settings.',
        recordIds: activeSeasons.map((season) => season.id),
      });
    }
  }

  return {
    ok: issues.every((issue) => issue.severity !== 'error'),
    databaseVersion: db.verno,
    storage: storageInfo,
    counts: {
      seasons: seasons.length,
      activeSeasons: activeSeasons.length,
      archivedSeasons: archivedSeasons.length,
      recipients: recipients.length,
      gifts: gifts.length,
      ideas: ideas.length,
    },
    issues,
  };
}
