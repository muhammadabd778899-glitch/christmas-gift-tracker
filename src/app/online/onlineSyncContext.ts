import { createContext, useContext } from 'react';
import type { AppError } from '../../domain/errors';
import type { ConnectAccountResult, ConnectionPlan } from '../../sync/connect';
import type { ConflictChoice } from '../../sync/conflicts';
import type { AccountUser } from '../../sync/supabase/auth';
import type { SyncConflict, SyncLink, SyncStatusSnapshot } from '../../storage/syncTypes';

export interface OnlineSyncContextValue {
  ready: boolean;
  user: AccountUser | null;
  link: SyncLink | null;
  status: SyncStatusSnapshot | null;
  conflicts: SyncConflict[];
  syncing: boolean;
  online: boolean;
  error: AppError | null;
  clearError: () => void;
  reloadSession: () => Promise<void>;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
  planConnection: () => Promise<ConnectionPlan>;
  connectDevice: (input: {
    confirmation: string;
    backupTaken: boolean;
  }) => Promise<ConnectAccountResult>;
  disconnectDevice: () => Promise<void>;
  resolve: (
    entityType: SyncConflict['entityType'],
    entityId: string,
    choice: ConflictChoice,
  ) => Promise<void>;
}

export const OnlineSyncContext = createContext<OnlineSyncContextValue | null>(null);

export function useOnlineSync(): OnlineSyncContextValue | null {
  return useContext(OnlineSyncContext);
}
