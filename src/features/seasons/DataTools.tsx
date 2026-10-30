import { useState } from 'react';
import {
  Database,
  Download,
  FileText,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { Season } from '../../domain/entities';
import type { ValidatedBackup } from '../../storage/backup';
import type { CsvScope } from '../../storage/csv';
import { downloadTextFile } from '../../lib/download';
import { errorMessageFrom } from '../../lib/formErrors';
import { useRepositories } from '../../app/providers/storageContext';
import styles from './DataTools.module.css';

interface NoticeProps {
  onNotice: (message: string) => void;
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

interface BackupRestoreCardProps extends NoticeProps {
  hasData: boolean;
}

export function BackupRestoreCard({ hasData, onNotice }: BackupRestoreCardProps) {
  const repositories = useRepositories();
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidatedBackup | null>(null);
  const [validating, setValidating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const downloadBackup = async (forRestore: boolean) => {
    setError(null);
    setExporting(true);

    try {
      const backup = await repositories.data.exportBackup();
      downloadTextFile(backup.filename, backup.content, 'application/json');

      if (forRestore) {
        setBackupDownloaded(true);
        onNotice(
          'A backup of the current data was downloaded. Restoring the chosen file is now enabled.',
        );
      } else {
        onNotice(
          `Backup downloaded with ${plural(backup.summary.seasons, 'season')}, ${plural(
            backup.summary.recipients,
            'recipient',
          )}, and ${plural(backup.summary.gifts, 'gift')}.`,
        );
      }
    } catch (downloadError) {
      setError(
        errorMessageFrom(downloadError, 'The backup could not be downloaded. Nothing was changed.'),
      );
    } finally {
      setExporting(false);
    }
  };

  const handleFile = async (selected: File | null) => {
    setFile(selected);
    setValidation(null);
    setBackupDownloaded(false);
    setConfirmation('');
    setError(null);

    if (!selected) {
      return;
    }

    setValidating(true);

    try {
      const checked = await repositories.data.validateBackup(selected);
      setValidation(checked);
    } catch (validationError) {
      setError(
        errorMessageFrom(
          validationError,
          'That backup could not be validated. Nothing was changed.',
        ),
      );
    } finally {
      setValidating(false);
    }
  };

  const handleRestore = async () => {
    if (!file || !validation) {
      return;
    }

    setError(null);
    setRestoring(true);

    try {
      const result = await repositories.data.restoreBackup(file, confirmation);
      setFile(null);
      setValidation(null);
      setBackupDownloaded(false);
      setConfirmation('');
      setInputKey((current) => current + 1);
      onNotice(
        `Backup restored: ${plural(result.summary.seasons, 'season')}, ${plural(
          result.summary.recipients,
          'recipient',
        )}, ${plural(result.summary.gifts, 'gift')}, and ${plural(result.summary.ideas, 'idea')}.`,
      );
      document.getElementById('main-content')?.focus();
    } catch (restoreError) {
      setError(
        errorMessageFrom(
          restoreError,
          'The backup could not be restored. The previous data has not been changed.',
        ),
      );
    } finally {
      setRestoring(false);
    }
  };

  const restoreReady =
    validation !== null && backupDownloaded && confirmation.trim() === 'RESTORE' && !restoring;

  return (
    <Card className={styles.toolCard}>
      <CardHeader>
        <Badge tone="evergreen">
          <Database size={12} aria-hidden="true" />
          Complete backup
        </Badge>
        <CardTitle as="h2">Backup and restore</CardTitle>
        <CardDescription>
          A JSON backup includes settings, every season, recipients, gifts, and ideas. Restore
          replaces everything on this device, so a fresh backup is required first.
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.toolBody}>
        <div className={styles.toolSection}>
          <h3>Download a backup</h3>
          <p>
            Includes addresses and notes because a complete backup must be recoverable. Keep the
            file private.
          </p>
          <Button variant="secondary" onClick={() => downloadBackup(false)} disabled={exporting}>
            <Download size={16} aria-hidden="true" />
            {exporting ? 'Preparing…' : hasData ? 'Download backup' : 'Download empty backup'}
          </Button>
        </div>

        <div className={styles.toolSection}>
          <h3>Restore from a backup</h3>
          <p>
            The file is checked before anything is written. Invalid, newer, or inconsistent backups
            are rejected without changing the current data.
          </p>
          <Input
            key={inputKey}
            id="backup-file"
            type="file"
            label="Choose a backup file"
            accept=".json,application/json"
            hint="The limit is 25 MB. Files are read on this device only."
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          />

          {validating ? (
            <p className={styles.status} role="status">
              <span className={styles.statusDot} aria-hidden="true" />
              Checking the backup…
            </p>
          ) : null}

          {validation ? (
            <div className={styles.validationSummary} role="status">
              <strong>This file is a valid backup.</strong>
              <dl>
                <div>
                  <dt>Exported</dt>
                  <dd>{formatTimestamp(validation.summary.exportedAt)}</dd>
                </div>
                <div>
                  <dt>Seasons</dt>
                  <dd>
                    {validation.summary.seasons} ({validation.summary.activeSeasons} active,{' '}
                    {validation.summary.archivedSeasons} archived)
                  </dd>
                </div>
                <div>
                  <dt>Records</dt>
                  <dd>
                    {validation.summary.recipients} recipients · {validation.summary.gifts} gifts ·{' '}
                    {validation.summary.ideas} ideas
                  </dd>
                </div>
                <div>
                  <dt>App</dt>
                  <dd>v{validation.summary.appVersion}</dd>
                </div>
              </dl>
              <p className={styles.warningText}>
                Restoring replaces all current data. Download a backup of the current data first.
              </p>
              <Button variant="secondary" onClick={() => downloadBackup(true)} disabled={exporting}>
                <Download size={16} aria-hidden="true" />
                {backupDownloaded
                  ? 'Download current data again'
                  : 'Download current data before restoring'}
              </Button>

              <Input
                id="restore-confirmation"
                label="Type RESTORE to replace this device's data"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                hint={
                  backupDownloaded
                    ? 'The typed confirmation and a downloaded backup are both required.'
                    : 'Download the current data first to enable restoring.'
                }
                autoComplete="off"
                spellCheck={false}
              />

              <Button variant="danger" onClick={handleRestore} disabled={!restoreReady}>
                <Upload size={16} aria-hidden="true" />
                {restoring ? 'Restoring…' : 'Restore backup (replace all data)'}
              </Button>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface CsvExportCardProps extends NoticeProps {
  activeSeason: Season | null;
}

export function CsvExportCard({ activeSeason, onNotice }: CsvExportCardProps) {
  const repositories = useRepositories();
  const [scope, setScope] = useState<CsvScope>(activeSeason ? 'active' : 'all');
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleExport = async () => {
    setError(null);
    setResult(null);
    setExporting(true);

    try {
      const exported = await repositories.data.exportCsv({ scope, includeSensitive });
      downloadTextFile(exported.filename, exported.content, 'text/csv;charset=utf-8');
      setResult(
        `${plural(exported.rowCount, 'gift row')} from ${plural(
          exported.seasonCount,
          'season',
        )} exported${exported.includeSensitive ? ' with address and notes columns' : ''}.`,
      );
      onNotice(`CSV downloaded: ${plural(exported.rowCount, 'gift row')}.`);
    } catch (exportError) {
      setError(
        errorMessageFrom(exportError, 'The CSV could not be exported. No data was changed.'),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className={styles.toolCard}>
      <CardHeader>
        <Badge tone="gold">
          <FileText size={12} aria-hidden="true" />
          Spreadsheet export
        </Badge>
        <CardTitle as="h2">CSV export</CardTitle>
        <CardDescription>
          UTF-8 with a byte-order mark, comma-separated, and quoted correctly for Excel, Numbers,
          and Sheets. Formula-like text is neutralized with a leading apostrophe.
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.toolBody}>
        <Select
          id="csv-scope"
          label="Include"
          value={scope}
          onChange={(event) => setScope(event.target.value as CsvScope)}
          hint="The active-season option exports one season. All seasons combines them with a Season column."
        >
          <option value="active" disabled={!activeSeason}>
            Active season{activeSeason ? ` — ${activeSeason.name}` : ' (none)'}
          </option>
          <option value="all">All seasons</option>
        </Select>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={includeSensitive}
            onChange={(event) => setIncludeSensitive(event.target.checked)}
            aria-label="Include addresses and notes"
          />
          <span>
            <strong>Include addresses and notes</strong>
            <span>Off by default because CSV files are often shared or opened in cloud apps.</span>
          </span>
        </label>

        {includeSensitive ? (
          <p className={styles.warningText}>
            <TriangleAlert size={15} aria-hidden="true" />
            This export will contain sensitive delivery addresses and free-text notes.
          </p>
        ) : null}

        <p className={styles.smallPrint}>
          Exports contain no internal IDs, schema metadata, or stored timestamps beyond purchased,
          wrapped, and sent dates.
        </p>

        <Button onClick={handleExport} disabled={exporting}>
          <Download size={16} aria-hidden="true" />
          {exporting ? 'Preparing…' : 'Download CSV'}
        </Button>

        {result ? (
          <p className={styles.success} role="status">
            {result}
          </p>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface SampleDataCardProps extends NoticeProps {
  sampleSeason: Season | null;
  hasRealData: boolean;
}

export function SampleDataCard({ sampleSeason, hasRealData, onNotice }: SampleDataCardProps) {
  const repositories = useRepositories();
  const [busy, setBusy] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);

    try {
      const result = await repositories.data.loadSampleData();

      if (!result.created) {
        onNotice('Sample data is already loaded. No duplicate season was created.');
      } else if (result.active) {
        onNotice('The sample season was added and is active. It is labeled everywhere it appears.');
      } else {
        onNotice(
          'The sample season was added as archived, so it does not change your active-season totals.',
        );
      }
    } catch (loadError) {
      setError(errorMessageFrom(loadError, 'The sample data could not be loaded.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      const result = await repositories.data.removeSampleData();
      setRemoveOpen(false);
      onNotice(
        result.removedSeasons > 0
          ? `Sample data was removed: ${plural(result.removedSeasons, 'season')}, ${plural(
              result.removedRecipients,
              'recipient',
            )}, ${plural(result.removedGifts, 'gift')}, and ${plural(
              result.removedIdeas,
              'idea',
            )}. Real seasons were untouched.`
          : 'There was no sample data to remove.',
      );
    } catch (removeError) {
      setError(errorMessageFrom(removeError, 'The sample data could not be removed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className={styles.toolCard}>
        <CardHeader>
          <Badge tone={sampleSeason ? 'success' : 'neutral'}>
            <Sparkles size={12} aria-hidden="true" />
            {sampleSeason ? 'Sample loaded' : 'Optional tour'}
          </Badge>
          <CardTitle as="h2">Sample data</CardTitle>
          <CardDescription>
            A fixed sample season with two people, three gifts, and two ideas. It is flagged as
            sample data, never mixes into real totals, and loading it twice does not duplicate it.
          </CardDescription>
        </CardHeader>
        <CardContent className={styles.toolBody}>
          {sampleSeason ? (
            <>
              <p className={styles.simpleNote}>
                {sampleSeason.name} is {sampleSeason.status === 'active' ? 'active' : 'archived'}.
                {hasRealData && sampleSeason.status === 'archived'
                  ? ' It was archived because real seasons exist, so your active totals are unchanged.'
                  : ' Removing it deletes only the records flagged as sample.'}
              </p>
              <Button variant="secondary" onClick={() => setRemoveOpen(true)} disabled={busy}>
                Remove sample data
              </Button>
            </>
          ) : (
            <>
              <p className={styles.simpleNote}>
                {hasRealData
                  ? 'Because real seasons exist, the sample is added as archived and never changes your active totals.'
                  : 'With no real seasons yet, the sample is added as the active season so you can explore. Remove it whenever you like.'}
              </p>
              <Button onClick={load} disabled={busy}>
                <Sparkles size={16} aria-hidden="true" />
                {busy ? 'Loading…' : 'Load sample data'}
              </Button>
            </>
          )}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {removeOpen && sampleSeason ? (
        <Dialog
          open
          onClose={() => (busy ? undefined : setRemoveOpen(false))}
          title="Remove sample data?"
          description="Only the sample season and its recipients, gifts, and ideas are deleted. Real data is never touched."
          footer={
            <>
              <Button variant="secondary" onClick={() => setRemoveOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="danger" onClick={remove} disabled={busy}>
                {busy ? 'Removing…' : 'Remove sample data'}
              </Button>
            </>
          }
        >
          <p className={styles.simpleNote}>
            If the sample season is active, the planner returns to the no-active-season state unless
            another season is restored.
          </p>
        </Dialog>
      ) : null}
    </>
  );
}

interface ResetDataCardProps {
  onReset: (message: string) => void;
}

export function ResetDataCard({ onReset }: ResetDataCardProps) {
  const repositories = useRepositories();
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadBackup = async () => {
    setBusy(true);
    setError(null);

    try {
      const backup = await repositories.data.exportBackup();
      downloadTextFile(backup.filename, backup.content, 'application/json');
      setBackupDownloaded(true);
    } catch (downloadError) {
      setError(
        errorMessageFrom(
          downloadError,
          'The pre-reset backup could not be downloaded. Resetting stays disabled.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setError(null);

    try {
      await repositories.data.resetAllData('DELETE');
      onReset('All planner data was cleared. A fresh, empty planner is ready.');
    } catch (resetError) {
      setError(
        errorMessageFrom(resetError, 'The data could not be cleared. No changes were made.'),
      );
      setBusy(false);
    }
  };

  const ready = backupDownloaded && confirmation.trim() === 'DELETE' && !busy;

  return (
    <Card className={styles.resetCard}>
      <CardHeader>
        <Badge tone="burgundy">
          <RotateCcw size={12} aria-hidden="true" />
          Destructive
        </Badge>
        <CardTitle as="h2">Reset all data</CardTitle>
        <CardDescription>
          Deletes every season, recipient, gift, idea, and sample record on this device. Settings
          return to their defaults. This cannot be undone without a backup.
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.toolBody}>
        <p className={styles.warningText}>
          <TriangleAlert size={15} aria-hidden="true" />A downloaded backup is required before the
          reset confirmation can be typed.
        </p>

        <Button
          variant="secondary"
          onClick={downloadBackup}
          disabled={busy}
          className={styles.resetButton}
        >
          <Download size={16} aria-hidden="true" />
          {backupDownloaded ? 'Download backup again' : 'Download backup first'}
        </Button>

        {backupDownloaded ? (
          <p className={styles.success} role="status">
            Backup downloaded. The reset is still a separate, explicit action.
          </p>
        ) : null}

        <Input
          id="reset-confirmation"
          label="Type DELETE to clear all data"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          hint="Nothing is cleared until both the backup and the exact word DELETE are present."
          autoComplete="off"
          spellCheck={false}
        />

        <Button variant="danger" onClick={reset} disabled={!ready}>
          <RotateCcw size={16} aria-hidden="true" />
          {busy ? 'Clearing…' : 'Reset all data'}
        </Button>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
