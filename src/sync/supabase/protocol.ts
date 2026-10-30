import { SyncError } from '../../domain/errors';
import { isSyncEntityType } from '../../storage/syncTypes';
import type { CloudRow, CloudWriteResult } from '../cloud';

export interface CloudRowPayload {
  entity_type: string;
  entity_id: string;
  revision: number;
  server_seq: number;
  deleted_at: string | null;
  updated_at: string;
  data: unknown;
}

function isRowPayload(value: unknown): value is CloudRowPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.entity_type === 'string' &&
    typeof row.entity_id === 'string' &&
    typeof row.revision === 'number' &&
    typeof row.server_seq === 'number' &&
    (row.deleted_at === null || typeof row.deleted_at === 'string') &&
    typeof row.updated_at === 'string'
  );
}

export function mapCloudRow(value: unknown): CloudRow {
  if (!isRowPayload(value) || !isSyncEntityType(value.entity_type)) {
    throw new SyncError('The cloud returned a record this app cannot read.');
  }

  return {
    entityType: value.entity_type,
    entityId: value.entity_id,
    revision: value.revision,
    seq: value.server_seq,
    deleted: value.deleted_at !== null,
    updatedAt: value.updated_at,
    data: value.data,
  };
}

export function mapCloudRows(value: unknown): CloudRow[] {
  if (!Array.isArray(value)) {
    throw new SyncError('The cloud returned an unexpected change list.');
  }

  return value.map(mapCloudRow);
}

export function mapWriteResult(value: unknown): CloudWriteResult {
  if (!value || typeof value !== 'object') {
    throw new SyncError('The cloud returned an unexpected response.');
  }

  const result = value as Record<string, unknown>;

  if (
    result.status === 'applied' &&
    typeof result.revision === 'number' &&
    typeof result.seq === 'number'
  ) {
    return { status: 'applied', revision: result.revision, seq: result.seq };
  }

  if (result.status === 'conflict') {
    return {
      status: 'conflict',
      remote:
        result.remote === null || result.remote === undefined ? null : mapCloudRow(result.remote),
    };
  }

  throw new SyncError('The cloud returned an unexpected response.');
}

export function mapCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value);
  }

  throw new SyncError('The cloud returned an unexpected record count.');
}
