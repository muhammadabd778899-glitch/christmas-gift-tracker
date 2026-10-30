import { useEffect, useState } from 'react';
import { Activity, HardDriveDownload, RefreshCw } from 'lucide-react';
import { useRepositories } from '../../app/providers/storageContext';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import type { HealthSeverity, StorageHealth } from '../../storage/health';
import { requestPersistentStorage, type PersistenceResult } from '../../storage/persistence';
import { errorMessageFrom } from '../../lib/formErrors';
import styles from './StorageDiagnostics.module.css';

const persistenceMessages: Record<PersistenceResult, string> = {
  granted:
    'Persistent storage granted. The browser should now keep your planner data even when disk space is low.',
  denied:
    'The browser declined persistent storage. Your data still works, but the browser may evict it under storage pressure — keep downloading backups.',
  unsupported:
    'This browser does not support persistent storage requests. Keep downloading backups so a cleared profile cannot erase your planner.',
  unavailable:
    'The persistent storage request could not be completed. Try again, and keep downloading backups.',
};

function formatBytes(value: number | null): string {
  if (value === null) {
    return 'Not reported';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }

  return `${size >= 10 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`;
}

function severityTone(severity: HealthSeverity): BadgeTone {
  if (severity === 'error') {
    return 'burgundy';
  }

  if (severity === 'warning') {
    return 'gold';
  }

  return 'neutral';
}

export function StorageDiagnostics() {
  const repositories = useRepositories();
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [requestingPersistence, setRequestingPersistence] = useState(false);
  const [persistenceResult, setPersistenceResult] = useState<PersistenceResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const result = await repositories.data.healthCheck();

        if (!cancelled) {
          setHealth(result);
          setError(null);
        }
      } catch (healthError) {
        if (!cancelled) {
          setError(
            errorMessageFrom(healthError, 'The storage health check could not be completed.'),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repositories, refreshKey]);

  function refresh() {
    setLoading(true);
    setError(null);
    setRefreshKey((key) => key + 1);
  }

  async function requestPersistence() {
    setRequestingPersistence(true);
    setPersistenceResult(null);

    try {
      const result = await requestPersistentStorage();
      setPersistenceResult(result);
      refresh();
    } finally {
      setRequestingPersistence(false);
    }
  }

  const persistence =
    health?.storage.persisted === null || health?.storage.persisted === undefined
      ? 'Not reported'
      : health.storage.persisted
        ? 'Persistent storage granted'
        : 'Best effort — the browser may evict data';

  return (
    <Card>
      <CardHeader>
        <Badge tone="evergreen">
          <Activity size={12} aria-hidden="true" />
          Diagnostics
        </Badge>
        <CardTitle as="h2">Storage health</CardTitle>
        <CardDescription>
          A read-only report with counts and integrity checks. It contains no names, addresses, or
          notes.
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.body}>
        {loading && !health ? (
          <p className={styles.status} role="status">
            Checking local storage…
          </p>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {health ? (
          <>
            <div className={styles.summary}>
              <Badge tone={health.ok ? 'success' : 'burgundy'}>
                {health.ok ? 'Healthy' : 'Attention needed'}
              </Badge>
              <span className={styles.summaryItem}>Database schema v{health.databaseVersion}</span>
              <span className={styles.summaryItem}>
                {health.storage.usageBytes === null
                  ? 'Storage estimate unavailable'
                  : `${formatBytes(health.storage.usageBytes)} used${
                      health.storage.quotaBytes === null
                        ? ''
                        : ` of ${formatBytes(health.storage.quotaBytes)}`
                    }`}
              </span>
              <span className={styles.summaryItem}>{persistence}</span>
            </div>

            <div className={styles.persistence}>
              <p>
                {health.storage.persisted === true
                  ? 'This browser has granted persistent storage. It should keep the planner data even when disk space is low or the site goes unused.'
                  : 'Browsers may evict site data when disk space is low or a site goes unused. Ask this browser to keep the planner data, and still download backups for a recovery copy.'}
              </p>
              {health.storage.persisted === true ? null : (
                <Button
                  variant="secondary"
                  onClick={() => void requestPersistence()}
                  disabled={requestingPersistence || loading}
                >
                  <HardDriveDownload size={16} aria-hidden="true" />
                  {requestingPersistence ? 'Requesting…' : 'Request persistent storage'}
                </Button>
              )}
              {persistenceResult ? (
                <p
                  className={
                    persistenceResult === 'granted' ? styles.success : styles.persistenceResult
                  }
                  role={persistenceResult === 'granted' ? 'status' : 'alert'}
                >
                  {persistenceMessages[persistenceResult]}
                </p>
              ) : null}
            </div>

            <dl className={styles.counts}>
              <div>
                <dt>Seasons</dt>
                <dd>
                  {health.counts.seasons}{' '}
                  <span>
                    ({health.counts.activeSeasons} active, {health.counts.archivedSeasons} archived)
                  </span>
                </dd>
              </div>
              <div>
                <dt>Recipients</dt>
                <dd>{health.counts.recipients}</dd>
              </div>
              <div>
                <dt>Gifts</dt>
                <dd>{health.counts.gifts}</dd>
              </div>
              <div>
                <dt>Ideas</dt>
                <dd>{health.counts.ideas}</dd>
              </div>
            </dl>

            {health.issues.length === 0 ? (
              <p className={styles.success} role="status">
                No integrity issues found.
              </p>
            ) : (
              <ul className={styles.issues} aria-label="Integrity issues">
                {health.issues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`} className={styles.issue}>
                    <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>
                    <div>
                      <strong>{issue.code.replaceAll('_', ' ').toLowerCase()}</strong>
                      <span>{issue.message}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}

        <Button variant="secondary" onClick={refresh} disabled={loading}>
          <RefreshCw size={16} aria-hidden="true" />
          {loading ? 'Checking…' : 'Refresh diagnostics'}
        </Button>
      </CardContent>
    </Card>
  );
}
