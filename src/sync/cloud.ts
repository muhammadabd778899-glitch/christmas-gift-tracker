import type { Timestamp } from '../domain/entities';
import type { SyncEntityType } from '../storage/syncTypes';

export interface CloudRow {
  entityType: SyncEntityType;
  entityId: string;
  revision: number;
  seq: number;
  deleted: boolean;
  updatedAt: Timestamp;
  data: unknown;
}

export interface CloudUpsertInput {
  entityType: SyncEntityType;
  entityId: string;
  baseRevision: number;
  data: unknown;
  updatedAt: Timestamp;
}

export interface CloudDeleteInput {
  entityType: SyncEntityType;
  entityId: string;
  baseRevision: number;
  deletedAt: Timestamp;
}

export type CloudWriteResult =
  | { status: 'applied'; revision: number; seq: number }
  | { status: 'conflict'; remote: CloudRow | null };

export interface CloudMirror {
  upsert(input: CloudUpsertInput): Promise<CloudWriteResult>;
  delete(input: CloudDeleteInput): Promise<CloudWriteResult>;
  listChanges(sinceSeq: number, limit: number): Promise<CloudRow[]>;
  countRows(): Promise<number>;
}

export function timestampsEqual(left: string | null, right: string | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }

  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);

  if (Number.isNaN(leftMs) || Number.isNaN(rightMs)) {
    return left === right;
  }

  return leftMs === rightMs;
}
