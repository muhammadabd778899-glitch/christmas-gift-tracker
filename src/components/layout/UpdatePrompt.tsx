import { useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { isServiceWorkerSupported } from '../../pwa/support';
import { usePwaUpdate } from '../../pwa/usePwaUpdate';
import styles from './UpdatePrompt.module.css';

function UpdateBanner() {
  const { needRefresh, offlineReady, dismiss, applyUpdate } = usePwaUpdate();
  const [applying, setApplying] = useState(false);
  const [blocked, setBlocked] = useState(false);

  if (!needRefresh && !offlineReady) {
    return null;
  }

  async function reloadToUpdate() {
    if (document.querySelector('dialog[open]')) {
      setBlocked(true);
      return;
    }

    setBlocked(false);
    setApplying(true);

    try {
      await applyUpdate();
    } catch {
      setApplying(false);
    }
  }

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">
        {needRefresh ? <RefreshCw size={18} /> : <CheckCircle2 size={18} />}
      </span>
      <div className={styles.copy}>
        <strong>{needRefresh ? 'A new version is ready.' : 'Ready to work offline.'}</strong>
        <span>
          {needRefresh
            ? 'Reload when you are ready. Your saved planner data stays on this device.'
            : 'This app has saved what it needs for offline use on this device.'}
        </span>
        {blocked ? (
          <span className={styles.warning}>
            Close any open dialog first so unsaved work is not discarded.
          </span>
        ) : null}
      </div>
      <div className={styles.actions}>
        {needRefresh ? (
          <Button
            variant="inverse"
            size="sm"
            onClick={() => void reloadToUpdate()}
            disabled={applying}
          >
            {applying ? 'Updating…' : 'Reload to update'}
          </Button>
        ) : null}
        <Button variant="ghost-inverse" size="sm" onClick={dismiss} disabled={applying}>
          {needRefresh ? 'Later' : 'Got it'}
        </Button>
      </div>
    </div>
  );
}

export function UpdatePrompt() {
  return isServiceWorkerSupported() ? <UpdateBanner /> : null;
}
