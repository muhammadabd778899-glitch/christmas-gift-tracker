import type { AppSettings, Gift, Idea, Recipient, Season, Timestamp } from '../domain/entities';

export const SYNC_ENTITY_TYPES = ['season', 'recipient', 'gift', 'idea', 'settings'] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export const SETTINGS_SYNC_ID = 'app';

export type SyncEntity = Season | Recipient | Gift | Idea | AppSettings;

export interface SyncEntityByType {
  season: Season;
  recipient: Recipient;
  gift: Gift;
  idea: Idea;
  settings: AppSettings;
}

export function isSyncEntityType(value: unknown): value is SyncEntityType {
  return typeof value === 'string' && (SYNC_ENTITY_TYPES as readonly string[]).includes(value);
}

export interface SyncOutboxEntry {
  entityType: SyncEntityType;
  entityId: string;
  queuedAt: Timestamp;
  attempts: number;
  lastError: string | null;
}

export interface SyncTombstone {
  entityType: SyncEntityType;
  entityId: string;
  deletedAt: Timestamp;
  attempts: number;
  lastError: string | null;
}

export interface SyncRecordState {
  entityType: SyncEntityType;
  entityId: string;
  serverRevision: number;
  syncedAt: Timestamp | null;
  lastError: string | null;
}

export type SyncConflictKind = 'update' | 'delete';

export interface SyncConflict {
  entityType: SyncEntityType;
  entityId: string;
  kind: SyncConflictKind;
  localData: SyncEntity | null;
  remoteData: SyncEntity | null;
  remoteDeleted: boolean;
  remoteRevision: number;
  detectedAt: Timestamp;
}

export interface SyncLink {
  key: 'link';
  userId: string;
  email: string | null;
  linkedAt: Timestamp;
  lastServerSeq: number;
  lastSyncedAt: Timestamp | null;
  lastError: string | null;
}

export type SyncGlobalState =
  | 'local'
  | 'signed-out'
  | 'idle'
  | 'offline'
  | 'syncing'
  | 'synced'
  | 'pending'
  | 'conflict'
  | 'error';

export interface SyncStatusSnapshot {
  state: SyncGlobalState;
  message: string | null;
  email: string | null;
  pendingCount: number;
  conflictCount: number;
  lastSyncedAt: Timestamp | null;
}

export function syncKey(entityType: SyncEntityType, entityId: string): [SyncEntityType, string] {
  return [entityType, entityId];
}

export function entityTypeLabel(entityType: SyncEntityType): string {
  switch (entityType) {
    case 'season':
      return 'Season';
    case 'recipient':
      return 'Recipient';
    case 'gift':
      return 'Gift';
    case 'idea':
      return 'Idea';
    case 'settings':
      return 'Settings';
  }
}

export function entityDisplayName(entityType: SyncEntityType, data: SyncEntity | null): string {
  if (!data) {
    return entityTypeLabel(entityType);
  }

  if (entityType === 'settings') {
    return 'Display settings';
  }

  return 'name' in data && typeof data.name === 'string' ? data.name : entityTypeLabel(entityType);
}
