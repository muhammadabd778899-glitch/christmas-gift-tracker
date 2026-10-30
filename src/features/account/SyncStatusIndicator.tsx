import { Link } from 'react-router-dom';
import { useOnlineSync } from '../../app/online/onlineSyncContext';
import { cn } from '../../lib/cn';
import type { SyncStatusSnapshot } from '../../storage/syncTypes';
import styles from './SyncStatusIndicator.module.css';

function labelFor(status: SyncStatusSnapshot | null, syncing: boolean): string {
  if (syncing) {
    return 'Syncing…';
  }

  if (!status) {
    return 'Account';
  }

  switch (status.state) {
    case 'synced':
      return 'Synced to your account';
    case 'pending':
      return status.pendingCount === 1
        ? '1 change waiting'
        : `${status.pendingCount} changes waiting`;
    case 'conflict':
      return status.conflictCount === 1
        ? '1 record needs a decision'
        : `${status.conflictCount} records need a decision`;
    case 'offline':
      return 'Offline — changes saved here';
    case 'error':
      return 'Sync needs attention';
    case 'local':
      return 'Not connected to an account';
    case 'idle':
    case 'signed-out':
    case 'syncing':
      return 'Account connected';
  }
}

export function SyncStatusIndicator() {
  const sync = useOnlineSync();

  if (!sync) {
    return null;
  }

  const state = sync.syncing ? 'syncing' : (sync.status?.state ?? 'idle');
  const label = labelFor(sync.status, sync.syncing);

  return (
    <Link
      to="/account"
      className={cn(styles.status, styles[state])}
      aria-label={`${label}. Open account settings.`}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
