import { SyncError } from '../../domain/errors';
import type { CloudMirror } from '../cloud';
import { getSupabaseClient } from './client';
import { mapCloudRows, mapCount, mapWriteResult } from './protocol';

function uploadError(error: unknown): SyncError {
  return new SyncError('Changes could not be uploaded to the account.', {
    cause: error,
    recovery:
      'Your edits are still saved on this device and queued. Check your connection and try again.',
  });
}

function downloadError(error: unknown): SyncError {
  return new SyncError('Cloud changes could not be downloaded.', {
    cause: error,
    recovery: 'Your local plans are unchanged. Check your connection and try again.',
  });
}

export function createSupabaseCloudMirror(): CloudMirror {
  return {
    async upsert(input) {
      const client = getSupabaseClient();
      const { data, error } = await client.rpc('sync_upsert', {
        p_entity_type: input.entityType,
        p_entity_id: input.entityId,
        p_base_revision: input.baseRevision,
        p_data: input.data,
        p_updated_at: input.updatedAt,
      });

      if (error) {
        throw uploadError(error);
      }

      return mapWriteResult(data);
    },

    async delete(input) {
      const client = getSupabaseClient();
      const { data, error } = await client.rpc('sync_delete', {
        p_entity_type: input.entityType,
        p_entity_id: input.entityId,
        p_base_revision: input.baseRevision,
        p_deleted_at: input.deletedAt,
      });

      if (error) {
        throw uploadError(error);
      }

      return mapWriteResult(data);
    },

    async listChanges(sinceSeq, limit) {
      const client = getSupabaseClient();
      const { data, error } = await client.rpc('sync_list_changes', {
        p_since_seq: sinceSeq,
        p_limit: limit,
      });

      if (error) {
        throw downloadError(error);
      }

      return mapCloudRows(data);
    },

    async countRows() {
      const client = getSupabaseClient();
      const { data, error } = await client.rpc('sync_count_rows');

      if (error) {
        throw downloadError(error);
      }

      return mapCount(data);
    },
  };
}
