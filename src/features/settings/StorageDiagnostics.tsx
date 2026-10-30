import { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
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
import { errorMessageFrom } from '../../lib/formErrors';
import styles from './StorageDiagnostics.module.css';

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
