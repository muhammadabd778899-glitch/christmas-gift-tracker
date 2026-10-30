import type { AppSettings, Gift, Idea, Recipient, Season } from '../domain/entities';
import {
  giftEntitySchema,
  ideaEntitySchema,
  parseWithSchema,
  recipientEntitySchema,
  seasonEntitySchema,
  settingsEntitySchema,
} from '../domain/schemas';
import type { GiftTrackerDatabase } from '../storage/db';
import { SETTINGS_SYNC_ID, type SyncEntity, type SyncEntityType } from '../storage/syncTypes';

export const UPLOAD_ORDER: readonly SyncEntityType[] = [
  'season',
  'recipient',
  'gift',
  'idea',
  'settings',
];

export const DELETE_ORDER: readonly SyncEntityType[] = [
  'gift',
  'idea',
  'recipient',
  'season',
  'settings',
];

export function parseCloudEntity(entityType: SyncEntityType, data: unknown): SyncEntity {
  switch (entityType) {
    case 'season':
      return parseWithSchema(seasonEntitySchema, data, 'A cloud season is invalid.');
    case 'recipient':
      return parseWithSchema(recipientEntitySchema, data, 'A cloud recipient is invalid.');
    case 'gift':
      return parseWithSchema(giftEntitySchema, data, 'A cloud gift is invalid.');
    case 'idea':
      return parseWithSchema(ideaEntitySchema, data, 'A cloud idea is invalid.');
    case 'settings':
      return parseWithSchema(settingsEntitySchema, data, 'A cloud settings record is invalid.');
  }
}

export function entityIdFor(entityType: SyncEntityType, entity: SyncEntity): string {
  return entityType === 'settings' ? SETTINGS_SYNC_ID : entity.id;
}

export async function readLocalEntity(
  db: GiftTrackerDatabase,
  entityType: SyncEntityType,
  entityId: string,
): Promise<SyncEntity | null> {
  switch (entityType) {
    case 'season':
      return (await db.seasons.get(entityId as Season['id'])) ?? null;
    case 'recipient':
      return (await db.recipients.get(entityId as Recipient['id'])) ?? null;
    case 'gift':
      return (await db.gifts.get(entityId as Gift['id'])) ?? null;
    case 'idea':
      return (await db.ideas.get(entityId as Idea['id'])) ?? null;
    case 'settings':
      return (await db.settings.get('app')) ?? null;
  }
}

export async function putLocalEntity(
  db: GiftTrackerDatabase,
  entityType: SyncEntityType,
  entity: SyncEntity,
): Promise<void> {
  switch (entityType) {
    case 'season':
      await db.seasons.put(entity as Season);
      return;
    case 'recipient':
      await db.recipients.put(entity as Recipient);
      return;
    case 'gift':
      await db.gifts.put(entity as Gift);
      return;
    case 'idea':
      await db.ideas.put(entity as Idea);
      return;
    case 'settings':
      await db.settings.put(entity as AppSettings);
      return;
  }
}

export async function deleteLocalEntity(
  db: GiftTrackerDatabase,
  entityType: SyncEntityType,
  entityId: string,
): Promise<void> {
  switch (entityType) {
    case 'season':
      await db.seasons.delete(entityId as Season['id']);
      return;
    case 'recipient':
      await db.recipients.delete(entityId as Recipient['id']);
      return;
    case 'gift':
      await db.gifts.delete(entityId as Gift['id']);
      return;
    case 'idea':
      await db.ideas.delete(entityId as Idea['id']);
      return;
    case 'settings':
      await db.settings.delete('app');
      return;
  }
}

export async function readAllLocalEntities(
  db: GiftTrackerDatabase,
): Promise<Array<{ entityType: SyncEntityType; entity: SyncEntity }>> {
  const [seasons, recipients, gifts, ideas, settings] = await Promise.all([
    db.seasons.toArray(),
    db.recipients.toArray(),
    db.gifts.toArray(),
    db.ideas.toArray(),
    db.settings.get('app'),
  ]);

  const records: Array<{ entityType: SyncEntityType; entity: SyncEntity }> = [
    ...seasons.map((entity) => ({ entityType: 'season' as const, entity })),
    ...recipients.map((entity) => ({ entityType: 'recipient' as const, entity })),
    ...gifts.map((entity) => ({ entityType: 'gift' as const, entity })),
    ...ideas.map((entity) => ({ entityType: 'idea' as const, entity })),
  ];

  if (settings) {
    records.push({ entityType: 'settings', entity: settings });
  }

  return records;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));

  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`;
}

export async function countLocalPlans(db: GiftTrackerDatabase): Promise<number> {
  const [seasons, recipients, gifts, ideas] = await Promise.all([
    db.seasons.count(),
    db.recipients.count(),
    db.gifts.count(),
    db.ideas.count(),
  ]);

  return seasons + recipients + gifts + ideas;
}
