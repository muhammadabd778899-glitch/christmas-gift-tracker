import { useOnlineStatus } from '../../lib/useOnlineStatus';
import { cn } from '../../lib/cn';
import styles from './ConnectionStatus.module.css';

export function ConnectionStatus() {
  const online = useOnlineStatus();

  return (
    <span
      className={cn(styles.status, online ? styles.online : styles.offline)}
      role="status"
      aria-live="polite"
    >
      <span className={styles.dot} aria-hidden="true" />
      {online ? 'Saved on this device' : 'Offline — all data saved on this device'}
    </span>
  );
}
