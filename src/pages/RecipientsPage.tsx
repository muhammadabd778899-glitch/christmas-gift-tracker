import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Plus, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { PageHeader } from '../components/ui/PageHeader';
import { buttonStyles } from '../components/ui/buttonStyles';
import { calculateRecipientMetricsById } from '../domain/calculations/recipients';
import type { Recipient } from '../domain/entities';
import { formatDateOnly } from '../domain/dates';
import { toAppError } from '../storage/errors';
import { DeleteRecipientDialog } from '../features/recipients/DeleteRecipientDialog';
import { RecipientCard } from '../features/recipients/RecipientCard';
import { RecipientFormDialog } from '../features/recipients/RecipientFormDialog';
import { useRecipientPageData } from '../features/recipients/useRecipientPageData';
import styles from './RecipientsPage.module.css';

interface RecipientsLocationState {
  notice?: string;
}

export function RecipientsPage() {
  const location = useLocation();
  const data = useRecipientPageData();
  const [formRecipient, setFormRecipient] = useState<Recipient | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Recipient | null>(null);
  const [notice, setNotice] = useState<string | null>(
    (location.state as RecipientsLocationState | null)?.notice ?? null,
  );
  const focusMainAfterNoticeRef = useRef(false);

  useEffect(() => {
    if (!notice) {
      return;
    }

    if (focusMainAfterNoticeRef.current) {
      focusMainAfterNoticeRef.current = false;
      document.getElementById('main-content')?.focus();
    }

    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (data.loading) {
    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="People"
          title="Recipients"
          description="The people you are planning for, with caps and spending kept separate."
        />
        <div className={styles.loadingGrid} role="status" aria-live="polite">
          <span className="sr-only">Loading recipients…</span>
          {[0, 1, 2].map((item) => (
            <div key={item} className={styles.skeletonCard} aria-hidden="true">
              <span className={styles.skeletonLineShort} />
              <span className={styles.skeletonLine} />
              <span className={styles.skeletonBlock} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.error || !data.data) {
    const appError = toAppError(data.error);
    return (
      <ErrorState
        title="Your recipients could not be loaded."
        description={
          appError.recovery ??
          'Your data has not been deleted. Reload the app and try again. If the problem continues, do not clear site data.'
        }
        actions={<Button onClick={() => window.location.reload()}>Reload app</Button>}
      />
    );
  }

  const { settings, season, recipients, gifts } = data.data;
  const metrics = calculateRecipientMetricsById(recipients, gifts);
  const archived = season?.status === 'archived';
  const canEdit = season !== null && !archived;
  const seasonDate = season ? formatDateOnly(season.holidayDate, settings.locale) : null;

  const headerActions = canEdit ? (
    <Button onClick={() => setFormRecipient(null)}>
      <Plus size={17} aria-hidden="true" />
      Add recipient
    </Button>
  ) : undefined;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="People"
        title="Recipients"
        description={
          season
            ? `The people in ${season.name}. Caps and spending are calculated from stored gift records, never typed as a summary.`
            : 'Recipients belong to a season. Create one before adding the people you are planning for.'
        }
        badge={
          season ? (
            archived ? (
              <Badge tone="neutral">Archived · read only</Badge>
            ) : (
              <Badge tone="gold">
                {recipients.length} {recipients.length === 1 ? 'person' : 'people'}
              </Badge>
            )
          ) : undefined
        }
        actions={headerActions}
      />

      {notice ? (
        <p className={styles.notice} role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}

      {!season ? (
        <EmptyState
          icon={<CalendarDays />}
          title="Create a season first"
          description="A season keeps one Christmas together: its people, gifts, budget, and dates. Nothing is created for you automatically."
          action={
            <Link className={buttonStyles({ variant: 'primary' })} to="/onboarding">
              Create your first season
            </Link>
          }
        />
      ) : archived ? (
        <>
          <div className={styles.archivedBanner} role="status">
            <span className={styles.archivedIcon} aria-hidden="true">
              <CalendarDays size={18} />
            </span>
            <div>
              <strong>{season.name} is archived.</strong>
              <p>
                {seasonDate} · Recipients are read-only. Restore the season from Seasons &amp;
                archives to make changes.
              </p>
            </div>
          </div>

          {recipients.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No recipients in this archived season"
              description="This season has no people stored. Nothing will be added while it is read-only."
            />
          ) : (
            <div className={styles.grid}>
              {recipients.map((recipient) => (
                <RecipientCard
                  key={recipient.id}
                  recipient={recipient}
                  metrics={metrics.get(recipient.id)!}
                  settings={settings}
                  readOnly
                  onEdit={() => undefined}
                  onDelete={() => undefined}
                />
              ))}
            </div>
          )}
        </>
      ) : recipients.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No recipients yet"
          description={`Add the first person you are planning for in ${season.name}. A name is enough; a budget cap and notes are optional.`}
          action={
            <Button onClick={() => setFormRecipient(null)}>
              <Plus size={17} aria-hidden="true" />
              Add your first recipient
            </Button>
          }
        />
      ) : (
        <>
          <div className={styles.seasonStrip}>
            <span className={styles.seasonStripIcon} aria-hidden="true">
              <CalendarDays size={16} />
            </span>
            <span>
              <strong>{season.name}</strong>
              <span className={styles.seasonStripDivider} aria-hidden="true" />
              {seasonDate}
            </span>
            <span className={styles.seasonStripCount}>
              {recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'}
            </span>
          </div>

          <div className={styles.grid}>
            {recipients.map((recipient) => (
              <RecipientCard
                key={recipient.id}
                recipient={recipient}
                metrics={metrics.get(recipient.id)!}
                settings={settings}
                readOnly={false}
                onEdit={setFormRecipient}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </>
      )}

      {formRecipient !== undefined && season && !archived ? (
        <RecipientFormDialog
          recipient={formRecipient}
          season={season}
          settings={settings}
          onClose={() => setFormRecipient(undefined)}
          onSaved={(message) => {
            setFormRecipient(undefined);
            setNotice(message);
          }}
        />
      ) : null}

      {deleteTarget && season && !archived ? (
        <DeleteRecipientDialog
          recipient={deleteTarget}
          otherRecipients={recipients.filter((recipient) => recipient.id !== deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(message) => {
            focusMainAfterNoticeRef.current = true;
            setDeleteTarget(null);
            setNotice(message);
          }}
        />
      ) : null}
    </div>
  );
}
