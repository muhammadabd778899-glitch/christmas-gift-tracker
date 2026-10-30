import type {
  CloudDeleteInput,
  CloudMirror,
  CloudRow,
  CloudUpsertInput,
  CloudWriteResult,
} from '../sync/cloud';
import { timestampsEqual } from '../sync/cloud';
import { stableStringify } from '../sync/entities';
import type { SyncEntityType } from '../storage/syncTypes';

interface StoredRow {
  userId: string;
  entityType: SyncEntityType;
  entityId: string;
  revision: number;
  seq: number;
  deleted: boolean;
  updatedAt: string;
  data: unknown;
}

function rowKey(userId: string, entityType: SyncEntityType, entityId: string): string {
  return `${userId}\u0000${entityType}\u0000${entityId}`;
}

function toCloudRow(row: StoredRow): CloudRow {
  return {
    entityType: row.entityType,
    entityId: row.entityId,
    revision: row.revision,
    seq: row.seq,
    deleted: row.deleted,
    updatedAt: row.updatedAt,
    data: row.data,
  };
}

export class FakeCloudServer {
  private readonly rows = new Map<string, StoredRow>();
  private sequence = 0;

  offline = false;

  adapterFor(userId: string): CloudMirror {
    return {
      upsert: (input) => this.upsert(userId, input),
      delete: (input) => this.delete(userId, input),
      listChanges: (sinceSeq, limit) => this.listChanges(userId, sinceSeq, limit),
      countRows: async () => {
        this.assertOnline();
        return [...this.rows.values()].filter((row) => row.userId === userId).length;
      },
    };
  }

  row(userId: string, entityType: SyncEntityType, entityId: string): CloudRow | null {
    const stored = this.rows.get(rowKey(userId, entityType, entityId));
    return stored ? toCloudRow(stored) : null;
  }

  seedRow(
    userId: string,
    entityType: SyncEntityType,
    entityId: string,
    data: unknown,
    updatedAt: string,
  ): CloudRow {
    const key = rowKey(userId, entityType, entityId);
    const existing = this.rows.get(key);
    const stored: StoredRow = {
      userId,
      entityType,
      entityId,
      revision: (existing?.revision ?? 0) + 1,
      seq: ++this.sequence,
      deleted: false,
      updatedAt,
      data,
    };

    this.rows.set(key, stored);
    return toCloudRow(stored);
  }

  private assertOnline(): void {
    if (this.offline) {
      throw new Error('Network unavailable');
    }
  }

  private async upsert(userId: string, input: CloudUpsertInput): Promise<CloudWriteResult> {
    this.assertOnline();
    const key = rowKey(userId, input.entityType, input.entityId);
    const existing = this.rows.get(key);

    if ((existing?.revision ?? 0) !== input.baseRevision) {
      return { status: 'conflict', remote: existing ? toCloudRow(existing) : null };
    }

    if (
      existing &&
      !existing.deleted &&
      timestampsEqual(existing.updatedAt, input.updatedAt) &&
      stableStringify(existing.data) === stableStringify(input.data)
    ) {
      return { status: 'applied', revision: existing.revision, seq: existing.seq };
    }

    const stored: StoredRow = {
      userId,
      entityType: input.entityType,
      entityId: input.entityId,
      revision: (existing?.revision ?? 0) + 1,
      seq: ++this.sequence,
      deleted: false,
      updatedAt: input.updatedAt,
      data: input.data,
    };

    this.rows.set(key, stored);
    return { status: 'applied', revision: stored.revision, seq: stored.seq };
  }

  private async delete(userId: string, input: CloudDeleteInput): Promise<CloudWriteResult> {
    this.assertOnline();
    const key = rowKey(userId, input.entityType, input.entityId);
    const existing = this.rows.get(key);

    if (!existing) {
      if (input.baseRevision !== 0) {
        return { status: 'conflict', remote: null };
      }

      return { status: 'applied', revision: 0, seq: 0 };
    }

    if (existing.revision !== input.baseRevision) {
      return { status: 'conflict', remote: toCloudRow(existing) };
    }

    if (existing.deleted) {
      return { status: 'applied', revision: existing.revision, seq: existing.seq };
    }

    existing.deleted = true;
    existing.data = null;
    existing.updatedAt = input.deletedAt;
    existing.revision += 1;
    existing.seq = ++this.sequence;

    return { status: 'applied', revision: existing.revision, seq: existing.seq };
  }

  private async listChanges(userId: string, sinceSeq: number, limit: number): Promise<CloudRow[]> {
    this.assertOnline();

    return [...this.rows.values()]
      .filter((row) => row.userId === userId && row.seq > sinceSeq)
      .sort((left, right) => left.seq - right.seq)
      .slice(0, limit)
      .map(toCloudRow);
  }
}
