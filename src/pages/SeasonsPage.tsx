import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  CheckCircle2,
  Eye,
  Gift as GiftIcon,
  LayoutDashboard,
  Lightbulb,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { PageHeader } from '../components/ui/PageHeader';
import { buttonStyles } from '../components/ui/buttonStyles';
import { useActiveSeason } from '../app/providers/useActiveSeason';
import { formatDateOnly } from '../domain/dates';
import type { AppSettings, Season } from '../domain/entities';
import { formatMoney } from '../domain/money';
import { toAppError } from '../storage/errors';
import { DeleteSeasonDialog } from '../features/seasons/SeasonConfirmDialogs';
import { ArchiveSeasonDialog, RestoreSeasonDialog } from '../features/seasons/SeasonConfirmDialogs';
import { SeasonFormDialog, type CopySource } from '../features/seasons/SeasonFormDialog';
import { SeasonPreviewDialog } from '../features/seasons/SeasonPreviewDialog';
import {
  BackupRestoreCard,
  CsvExportCard,
  ResetDataCard,
  SampleDataCard,
} from '../features/seasons/DataTools';
import { useSeasonsPageData, type SeasonOverview } from '../features/seasons/useSeasonsPageData';
import styles from './SeasonsPage.module.css';

function formatArchivedAt(timestamp: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(timestamp));
}

function moneyFor(settings: AppSettings, value: number | null): string {
  return formatMoney(value, {
    fractionDigits: settings.fractionDigits,
    currencySymbol: settings.currencySymbol,
    locale: settings.locale,
  });
}

function SeasonStats({ overview, settings }: { overview: SeasonOverview; settings: AppSettings }) {
  const { season, recipientCount, giftCount, ideaCount, totals } = overview;

  return (
    <dl className={styles.statGrid}>
      <div>
        <dt>
          <Users size={14} aria-hidden="true" />
          Recipients
        </dt>
        <dd>{recipientCount}</dd>
      </div>
      <div>
        <dt>
          <GiftIcon size={14} aria-hidden="true" />
          Gifts
        </dt>
        <dd>{giftCount}</dd>
      </div>
      <div>
        <dt>
          <Lightbulb size={14} aria-hidden="true" />
          Ideas
        </dt>
        <dd>{ideaCount}</dd>
      </div>
      <div>
        <dt>Planned</dt>
        <dd>{moneyFor(settings, totals.plannedTotalMinor)}</dd>
      </div>
      <div>
        <dt>Actual</dt>
        <dd>{moneyFor(settings, totals.actualSpentMinor)}</dd>
      </div>
      <div>
        <dt>Budget</dt>
        <dd>{moneyFor(settings, season.budgetMinor)}</dd>
      </div>
    </dl>
  );
}

export function SeasonsPage() {
  const repositoriesData = useSeasonsPageData();
  const active = useActiveSeason();
  const navigate = useNavigate();
  const [formSeason, setFormSeason] = useState<Season | null | undefined>(undefined);
  const [archiveTarget, setArchiveTarget] = useState<SeasonOverview | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<SeasonOverview | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SeasonOverview | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Season | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const focusMainAfterNoticeRef = useRef(false);

  useEffect(() => {
    if (!notice) {
      return;
    }

    if (focusMainAfterNoticeRef.current) {
      focusMainAfterNoticeRef.current = false;
      document.getElementById('main-content')?.focus();
    }

    const timer = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const announce = (message: string, focusMain = false) => {
    focusMainAfterNoticeRef.current = focusMain;
    setNotice(message);
  };

  if (repositoriesData.loading || active.loading) {
    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="Year after year"
          title="Seasons & archives"
          description="Keep every Christmas intact, then start the next one without losing the last."
        />
        <Card>
          <CardContent className={styles.loadingCard} role="status" aria-live="polite">
            <span className={styles.loadingDot} aria-hidden="true" />
            Loading seasons and archives…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (repositoriesData.error || !repositoriesData.data || active.error || !active.data) {
    const appError = toAppError(repositoriesData.error ?? active.error);
    return (
      <ErrorState
        title="Your seasons could not be loaded."
        description={
          appError.recovery ??
          'Your data has not been changed. Reload the app and try again. If the problem continues, do not clear site data.'
        }
        actions={<Button onClick={() => window.location.reload()}>Reload app</Button>}
      />
    );
  }

  const { settings, seasons, activeSeason, sampleSeason, overviews } = repositoriesData.data;
  const activeOverview = activeSeason
    ? (overviews.find((overview) => overview.season.id === activeSeason.id) ?? null)
    : null;
  const archived = overviews.filter((overview) => overview.season.status === 'archived');
  const restorableArchived = archived.filter((overview) => !overview.season.isSample);
  const hasRealData = seasons.some((season) => !season.isSample);
  const copySources: CopySource[] = overviews
    .filter((overview) => overview.recipientCount > 0)
    .map((overview) => ({
      id: overview.season.id,
      name: overview.season.name,
      recipientCount: overview.recipientCount,
    }));

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Year after year"
        title="Seasons & archives"
        description="Create the next Christmas, keep finished ones read-only, and protect everything with backups and exports."
        badge={
          activeSeason ? (
            <Badge tone="success">
              <CheckCircle2 size={12} aria-hidden="true" />1 active · {seasons.length} total
            </Badge>
          ) : (
            <Badge tone="neutral">No active season</Badge>
          )
        }
        actions={
          <Button onClick={() => setFormSeason(null)}>
            <Plus size={17} aria-hidden="true" />
            New season
          </Button>
        }
      />

      {notice ? (
        <p className={styles.notice} role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}

      <section className={styles.section} aria-labelledby="active-season-title">
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.eyebrow}>Current</p>
            <h2 id="active-season-title">Active season</h2>
          </div>
          <p>
            At most one season is active. Archived seasons stay complete and read-only; switching
            never merges records.
          </p>
        </div>

        {activeOverview ? (
          <Card className={styles.activeCard}>
            <CardHeader>
              <div className={styles.badgeRow}>
                <Badge tone="success">
                  <CheckCircle2 size={12} aria-hidden="true" />
                  Active
                </Badge>
                {activeOverview.season.isSample ? (
                  <Badge tone="gold">
                    <Sparkles size={12} aria-hidden="true" />
                    Sample data
                  </Badge>
                ) : null}
              </div>
              <CardTitle as="h2">{activeOverview.season.name}</CardTitle>
              <CardDescription>
                {formatDateOnly(activeOverview.season.holidayDate, settings.locale)} ·{' '}
                {activeOverview.season.budgetMinor === null
                  ? 'No overall budget set'
                  : `${moneyFor(settings, activeOverview.season.budgetMinor)} season budget`}
                {activeOverview.season.isSample
                  ? ' · This is example data, not your real plan.'
                  : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SeasonStats overview={activeOverview} settings={settings} />
              <div className={styles.cardActions}>
                <Link className={buttonStyles({ variant: 'primary' })} to="/">
                  <LayoutDashboard size={16} aria-hidden="true" />
                  Open dashboard
                </Link>
                <Button variant="secondary" onClick={() => setFormSeason(activeOverview.season)}>
                  <Pencil size={16} aria-hidden="true" />
                  Edit details
                </Button>
                <Button variant="secondary" onClick={() => setArchiveTarget(activeOverview)}>
                  <Archive size={16} aria-hidden="true" />
                  Archive season
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className={styles.emptyCard}>
            <CardContent>
              <EmptyState
                icon={<CalendarDays />}
                title={seasons.length === 0 ? 'Start your first season' : 'No active season'}
                description={
                  seasons.length === 0
                    ? 'A season holds one Christmas: its people, gifts, ideas, and budget. Nothing is created automatically, and no sample data is loaded for you.'
                    : 'Your archived seasons are safe below. Create the next season or restore an archived one to make it active again.'
                }
                action={
                  <div className={styles.emptyActions}>
                    <Button onClick={() => setFormSeason(null)}>
                      <Plus size={17} aria-hidden="true" />
                      Create season
                    </Button>
                    {restorableArchived.length > 0 ? (
                      <Button
                        variant="secondary"
                        onClick={() => setRestoreTarget(restorableArchived[0] ?? null)}
                      >
                        <ArchiveRestore size={16} aria-hidden="true" />
                        Restore {restorableArchived[0]?.season.name}
                      </Button>
                    ) : null}
                  </div>
                }
              />
            </CardContent>
          </Card>
        )}
      </section>

      <section className={styles.section} aria-labelledby="archived-seasons-title">
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.eyebrow}>History</p>
            <h2 id="archived-seasons-title">Archived seasons</h2>
          </div>
          <p>
            Archived data is viewable, exportable, and included in backups. Restore a season to edit
            it; that archives the current one in the same transaction.
          </p>
        </div>

        {archived.length === 0 ? (
          <p className={styles.emptyNote}>
            No archived seasons yet. Archiving the active season keeps every record and frees the
            dashboard for the next Christmas.
          </p>
        ) : (
          <div className={styles.seasonGrid}>
            {archived.map((overview) => {
              const archivedAt = overview.season.archivedAt;

              return (
                <Card key={overview.season.id} className={styles.seasonCard}>
                  <CardHeader>
                    <div className={styles.badgeRow}>
                      <Badge tone="neutral">
                        <Archive size={12} aria-hidden="true" />
                        Archived
                      </Badge>
                      {overview.season.isSample ? <Badge tone="gold">Sample data</Badge> : null}
                    </div>
                    <CardTitle as="h3">{overview.season.name}</CardTitle>
                    <CardDescription>
                      {formatDateOnly(overview.season.holidayDate, settings.locale)}
                      {archivedAt
                        ? ` · archived ${formatArchivedAt(archivedAt, settings.locale)}`
                        : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SeasonStats overview={overview} settings={settings} />
                    <div className={styles.cardActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPreviewTarget(overview.season)}
                      >
                        <Eye size={15} aria-hidden="true" />
                        View
                      </Button>
                      {overview.season.isSample ? null : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setRestoreTarget(overview)}
                        >
                          <ArchiveRestore size={15} aria-hidden="true" />
                          Restore
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(overview)}>
                        <Trash2 size={15} aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="data-tools-title">
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.eyebrow}>Portability</p>
            <h2 id="data-tools-title">Data, backups, and exports</h2>
          </div>
          <p>
            Your planner is local to this browser. Backups and CSV exports are the deliberate ways
            to take a copy with you. Nothing is uploaded or synced.
          </p>
        </div>

        <div className={styles.toolsGrid}>
          <BackupRestoreCard hasData={seasons.length > 0} onNotice={announce} />
          <CsvExportCard activeSeason={activeSeason} onNotice={announce} />
          <SampleDataCard
            sampleSeason={sampleSeason}
            hasRealData={hasRealData}
            onNotice={announce}
          />
          <ResetDataCard
            onReset={(message) => {
              navigate('/onboarding', { replace: true, state: { notice: message } });
            }}
          />
        </div>
      </section>

      {formSeason !== undefined ? (
        <SeasonFormDialog
          season={formSeason}
          activeSeason={activeSeason}
          copySources={copySources}
          settings={settings}
          onClose={() => setFormSeason(undefined)}
          onSaved={(message) => {
            setFormSeason(undefined);
            announce(message, true);
          }}
        />
      ) : null}

      {archiveTarget ? (
        <ArchiveSeasonDialog
          season={archiveTarget.season}
          giftCount={archiveTarget.giftCount}
          recipientCount={archiveTarget.recipientCount}
          onClose={() => setArchiveTarget(null)}
          onArchived={(message) => {
            setArchiveTarget(null);
            announce(message, true);
          }}
        />
      ) : null}

      {restoreTarget ? (
        <RestoreSeasonDialog
          season={restoreTarget.season}
          activeSeason={activeSeason}
          onClose={() => setRestoreTarget(null)}
          onRestored={(message) => {
            setRestoreTarget(null);
            announce(message, true);
          }}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteSeasonDialog
          season={deleteTarget.season}
          recipientCount={deleteTarget.recipientCount}
          giftCount={deleteTarget.giftCount}
          ideaCount={deleteTarget.ideaCount}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(message) => {
            setDeleteTarget(null);
            announce(message, true);
          }}
        />
      ) : null}

      {previewTarget ? (
        <SeasonPreviewDialog
          season={previewTarget}
          settings={settings}
          onClose={() => setPreviewTarget(null)}
        />
      ) : null}
    </div>
  );
}
