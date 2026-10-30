import { useState } from 'react';
import { CloudOff, Download } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { useInstallPrompt, type InstallOutcome } from '../../pwa/useInstallPrompt';
import styles from './OfflineSettings.module.css';

const installMessages: Record<InstallOutcome, string> = {
  accepted: 'The planner was installed. Launch it from your app list or home screen.',
  dismissed:
    'Installation was dismissed. You can keep using this browser and install it later from the browser menu.',
  unavailable:
    'This browser did not offer an install prompt. Use the browser menu steps below instead.',
};

export function OfflineSettings() {
  const { canInstall, installed, install } = useInstallPrompt();
  const [installing, setInstalling] = useState(false);
  const [outcome, setOutcome] = useState<InstallOutcome | null>(null);

  async function startInstall() {
    setInstalling(true);
    setOutcome(null);

    try {
      setOutcome(await install());
    } finally {
      setInstalling(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <Badge tone="gold">
          <CloudOff size={12} aria-hidden="true" />
          Offline
        </Badge>
        <CardTitle as="h2">Install and work offline</CardTitle>
        <CardDescription>
          This planner is an installable offline-first web app. After one online visit, it can
          launch and work without a connection. Your data stays on this device.
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.body}>
        <p className={styles.status} role="status">
          {installed
            ? 'Installed on this device. Launch it from your app list or home screen.'
            : 'Running in this browser. Installing adds a dedicated window and a home-screen icon.'}
        </p>

        {installed ? null : (
          <div className={styles.actions}>
            {canInstall ? (
              <Button onClick={() => void startInstall()} disabled={installing}>
                <Download size={16} aria-hidden="true" />
                {installing ? 'Opening install prompt…' : 'Install app'}
              </Button>
            ) : null}
            {outcome ? (
              <p className={styles.outcome} role="status">
                {installMessages[outcome]}
              </p>
            ) : null}
          </div>
        )}

        {installed ? null : (
          <div className={styles.steps}>
            <strong>How to install</strong>
            <ul>
              <li>
                <span>Chrome or Edge (desktop)</span>
                Use the install icon in the address bar, or open the browser menu and choose
                “Install this site as an app”.
              </li>
              <li>
                <span>Android</span>
                Open the browser menu and choose “Install app” or “Add to Home screen”.
              </li>
              <li>
                <span>iPhone or iPad (Safari)</span>
                Tap Share, then “Add to Home Screen”.
              </li>
              <li>
                <span>Firefox (desktop)</span>
                No app install is offered. Keep a bookmark; offline use still requires the first
                visit while online.
              </li>
            </ul>
          </div>
        )}

        <p className={styles.note}>
          One online visit is required before the first offline launch. Clearing this site’s data
          deletes the planner’s records, so download a backup first. When an update is ready, the
          planner asks before reloading; it never replaces a page with unsaved form work.
        </p>
      </CardContent>
    </Card>
  );
}
