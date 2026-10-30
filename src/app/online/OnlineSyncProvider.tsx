import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SyncLink, SyncStatusSnapshot, SyncConflict } from '../../storage/syncTypes';
import { setChangeTrackingEnabled, subscribeToLocalChanges } from '../../storage/changeTracking';
import { disconnectDevice as disconnectDeviceState, readSyncLink } from '../../storage/syncLink';
import { toAppError } from '../../storage/errors';
import type { AppError } from '../../domain/errors';
import { useOnlineStatus } from '../../lib/useOnlineStatus';
import { useRepositories } from '../providers/storageContext';
import { AuthError } from '../../domain/errors';
import { getCurrentUser, type AccountUser } from '../../sync/supabase/auth';
import { createSupabaseCloudMirror } from '../../sync/supabase/adapter';
import { getSupabaseClient } from '../../sync/supabase/client';
import { getSyncStatus, syncNow as runEngineSync } from '../../sync/engine';
import { connectAccount, planConnection as buildConnectionPlan } from '../../sync/connect';
import { listConflicts, resolveConflict, type ConflictChoice } from '../../sync/conflicts';
import { OnlineSyncContext, type OnlineSyncContextValue } from './onlineSyncContext';

const AUTO_SYNC_INTERVAL_MS = 30_000;
const CHANGE_DEBOUNCE_MS = 2_500;

export function OnlineSyncProvider({ children }: { children: ReactNode }) {
  const repositories = useRepositories();
  const db = repositories.context.db;
  const adapter = useMemo(() => createSupabaseCloudMirror(), []);
  const online = useOnlineStatus();

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [link, setLink] = useState<SyncLink | null>(null);
  const [status, setStatus] = useState<SyncStatusSnapshot | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    const [linkRecord, statusSnapshot, conflictRows] = await Promise.all([
      readSyncLink(db),
      getSyncStatus(db, { online }),
      listConflicts(db),
    ]);

    setLink(linkRecord);
    setStatus(statusSnapshot);
    setConflicts(conflictRows);
    setChangeTrackingEnabled(linkRecord !== null);
  }, [db, online]);

  const reloadSession = useCallback(async () => {
    try {
      const current = await getCurrentUser();
      setUser(current);
      setError(null);
    } catch (caught) {
      setUser(null);
      setError(toAppError(caught));
    } finally {
      setReady(true);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => {};

    void (async () => {
      await reloadSession();

      if (!active) {
        return;
      }

      try {
        const client = getSupabaseClient();
        const { data } = client.auth.onAuthStateChange((_event, session) => {
          if (!active) {
            return;
          }

          setUser(
            session?.user ? { id: session.user.id, email: session.user.email ?? null } : null,
          );
          void refresh();
        });

        unsubscribe = () => data.subscription.unsubscribe();
      } catch (caught) {
        if (!active) {
          return;
        }

        setError(toAppError(caught));
        setReady(true);
      }
    })();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [refresh, reloadSession]);

  const syncNow = useCallback(async () => {
    if (!user || !online || syncingRef.current) {
      return;
    }

    const currentLink = await readSyncLink(db);
    if (!currentLink || currentLink.userId !== user.id) {
      return;
    }

    syncingRef.current = true;
    setSyncing(true);

    try {
      await runEngineSync({ db, adapter, nowIso: () => new Date().toISOString() });
      setError(null);
    } catch (caught) {
      setError(toAppError(caught));
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [adapter, db, online, refresh, user]);

  useEffect(() => {
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  useEffect(() => {
    if (!online || !user) {
      return;
    }

    const linkMatches = link?.userId === user.id;
    if (!linkMatches) {
      return;
    }

    const firstRun = window.setTimeout(() => {
      void syncNow();
    }, 0);
    const interval = window.setInterval(() => {
      void syncNow();
    }, AUTO_SYNC_INTERVAL_MS);

    return () => {
      window.clearTimeout(firstRun);
      window.clearInterval(interval);
    };
  }, [link?.userId, online, syncNow, user]);

  useEffect(() => {
    if (!link) {
      return;
    }

    let timer = 0;
    const unsubscribe = subscribeToLocalChanges(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void refresh();
        if (user && online) {
          void syncNow();
        }
      }, CHANGE_DEBOUNCE_MS);
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [link, online, refresh, syncNow, user]);

  const planConnection = useCallback(() => buildConnectionPlan(db, adapter), [adapter, db]);

  const connectDevice = useCallback(
    async (input: { confirmation: string; backupTaken: boolean }) => {
      if (!user) {
        throw new AuthError('Sign in before connecting this device.', {
          recovery: 'Create an account or sign in, then connect this device.',
        });
      }

      try {
        const result = await connectAccount(
          { db, adapter, nowIso: () => new Date().toISOString() },
          {
            userId: user.id,
            email: user.email,
            confirmation: input.confirmation,
            backupTaken: input.backupTaken,
          },
        );
        setError(null);
        await refresh();
        return result;
      } catch (caught) {
        setError(toAppError(caught));
        throw caught;
      }
    },
    [adapter, db, refresh, user],
  );

  const disconnect = useCallback(async () => {
    await disconnectDeviceState(db);
    setError(null);
    await refresh();
  }, [db, refresh]);

  const resolve = useCallback(
    async (entityType: SyncConflict['entityType'], entityId: string, choice: ConflictChoice) => {
      await resolveConflict(
        { db, nowIso: () => new Date().toISOString() },
        entityType,
        entityId,
        choice,
      );
      await refresh();

      if (choice === 'local') {
        await syncNow();
      }
    },
    [db, refresh, syncNow],
  );

  const value = useMemo<OnlineSyncContextValue>(
    () => ({
      ready,
      user,
      link,
      status,
      conflicts,
      syncing,
      online,
      error,
      clearError: () => setError(null),
      reloadSession,
      refresh,
      syncNow,
      planConnection,
      connectDevice,
      disconnectDevice: disconnect,
      resolve,
    }),
    [
      conflicts,
      connectDevice,
      disconnect,
      error,
      link,
      online,
      planConnection,
      ready,
      refresh,
      reloadSession,
      resolve,
      status,
      syncNow,
      syncing,
      user,
    ],
  );

  return <OnlineSyncContext.Provider value={value}>{children}</OnlineSyncContext.Provider>;
}
