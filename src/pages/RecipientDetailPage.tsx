import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Gift as GiftIcon,
  PackageCheck,
  Pencil,
  Send,
  ShoppingBag,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { InfoTip } from '../components/ui/InfoTip';
import { PageHeader } from '../components/ui/PageHeader';
import { buttonStyles } from '../components/ui/buttonStyles';
import { calculateProgress, formatRatioPercent } from '../domain/calculations/dashboard';
import { DEFAULT_GIFT_SORT, sortGifts } from '../domain/calculations/giftList';
import { buildRecipientDetail, type RecipientMetrics } from '../domain/calculations/recipients';
import { formatDateOnly } from '../domain/dates';
import type { AppSettings, Gift as GiftEntity, Recipient } from '../domain/entities';
import { formatMoney } from '../domain/money';
import { toAppError } from '../storage/errors';
import { errorMessageFrom } from '../lib/formErrors';
import { DeleteGiftDialog } from '../features/gifts/DeleteGiftDialog';
import { GiftFormDialog } from '../features/gifts/GiftFormDialog';
import { GiftTable } from '../features/gifts/GiftTable';
import type { GiftStatusField } from '../features/gifts/GiftRow';
import { UnbuyGiftDialog } from '../features/gifts/UnbuyGiftDialog';
import { RecipientFormDialog } from '../features/recipients/RecipientFormDialog';
import { useRecipientPageData } from '../features/recipients/useRecipientPageData';
import { useRepositories } from '../app/providers/storageContext';
import styles from './RecipientDetailPage.module.css';

interface ProgressRowProps {
  icon: ReactNode;
  label: string;
  count: number;
  total: number;
  ratio: number | null;
}

function ProgressRow({ icon, label, count, total, ratio }: ProgressRowProps) {
  const percent = ratio === null ? null : Math.round(ratio * 100);

  return (
    <div className={styles.progressRow}>
      <div className={styles.progressHeading}>
        <span className={styles.progressIcon} aria-hidden="true">
          {icon}
        </span>
        <span className={styles.progressLabel}>{label}</span>
        <span className={styles.progressCount}>
          {count} of {total}
          {percent === null ? '' : ` · ${percent}%`}
        </span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={`${label}: ${count} of ${total}`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={count}
      >
        <span className={styles.progressFill} style={{ width: `${percent ?? 0}%` }} />
      </div>
    </div>
  );
}

function money(value: number | null, settings: AppSettings): string {
  return formatMoney(value, {
    fractionDigits: settings.fractionDigits,
    currencySymbol: settings.currencySymbol,
    locale: settings.locale,
  });
}

function utilizationText(metrics: RecipientMetrics): string {
  if (metrics.capMinor === null) return 'No cap set';
  if (metrics.capMinor === 0) return metrics.overCap ? 'Over a zero cap' : 'Zero cap';
  return formatRatioPercent(metrics.utilization);
}

function capSummary(metrics: RecipientMetrics, settings: AppSettings): string {
  if (metrics.capMinor === null) {
    return 'No budget cap is set for this recipient. Spending is still tracked from bought gifts.';
  }

  if (metrics.capMinor === 0) {
    return metrics.overCap
      ? `A zero cap allows no spending. This recipient is over by ${money(
          metrics.capExceededByMinor,
          settings,
        )}.`
      : 'A zero cap allows no spending. No spending is recorded yet.';
  }

  if (metrics.overCap) {
    return `Over cap by ${money(metrics.capExceededByMinor, settings)}. ${money(
      metrics.spentMinor,
      settings,
    )} spent of ${money(metrics.capMinor, settings)}.`;
  }

  return `${money(metrics.spentMinor, settings)} spent of ${money(
    metrics.capMinor,
    settings,
  )}. ${money(metrics.remainingCapMinor, settings)} remains.`;
}

function capPercent(metrics: RecipientMetrics): number | null {
  if (metrics.capMinor === null) return null;
  if (metrics.utilization === null) return metrics.overCap ? 100 : 0;
  return Math.min(100, Math.round(metrics.utilization * 100));
}

export function RecipientDetailPage() {
  const { recipientId } = useParams<{ recipientId: string }>();
  const data = useRecipientPageData();
  const repositories = useRepositories();
  const [formGift, setFormGift] = useState<GiftEntity | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<GiftEntity | null>(null);
  const [unbuyTarget, setUnbuyTarget] = useState<GiftEntity | null>(null);
  const [editRecipientOpen, setEditRecipientOpen] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const focusMainAfterNoticeRef = useRef(false);

  useEffect(() => {
    if (!notice) return;

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
          title="Recipient details"
          description="Loading this recipient and their gifts."
        />
        <div className={styles.loadingCard} role="status" aria-live="polite">
          <span className={styles.loadingDot} aria-hidden="true" />
          Loading recipient…
        </div>
      </div>
    );
  }

  if (data.error || !data.data) {
    const appError = toAppError(data.error);
    return (
      <ErrorState
        title="This recipient could not be loaded."
        description={
          appError.recovery ??
          'Your data has not been deleted. Reload the app and try again. If the problem continues, do not clear site data.'
        }
        actions={<Button onClick={() => window.location.reload()}>Reload app</Button>}
      />
    );
  }

  const { settings, season, recipients, gifts } = data.data;

  if (!season) {
    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="People"
          title="Recipient details"
          description="Recipients belong to a season."
        />
        <EmptyState
          icon={<CalendarDays />}
          title="Create a season first"
          description="A season keeps one Christmas together: its people, gifts, budget, and dates."
          action={
            <Link className={buttonStyles({ variant: 'primary' })} to="/onboarding">
              Create your first season
            </Link>
          }
        />
      </div>
    );
  }

  const recipient = recipients.find((candidate) => candidate.id === recipientId);

  if (!recipient) {
    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="People"
          title="Recipient not found"
          description={`This recipient is not in ${season.name}.`}
        />
        <EmptyState
          icon={<Users />}
          title="This recipient is not available"
          description="The recipient may have been deleted, or the link may be out of date. No data was changed."
          action={
            <Link className={buttonStyles({ variant: 'primary' })} to="/recipients">
              Back to recipients
            </Link>
          }
        />
      </div>
    );
  }

  const archived = season.status === 'archived';
  const canEdit = !archived;
  const detail = buildRecipientDetail(recipient, gifts);
  const recipientGifts = sortGifts(detail.gifts, [recipient], DEFAULT_GIFT_SORT);
  const metrics = detail.metrics;
  const progress = calculateProgress(recipientGifts);
  const recipientMap = new Map<string, Recipient>([[recipient.id, recipient]]);
  const seasonDate = formatDateOnly(season.holidayDate, settings.locale);
  const capWidth = capPercent(metrics);
  const relationship = recipient.relationship ? `${recipient.relationship} · ` : '';

  const handleQuickStatus = async (gift: GiftEntity, field: GiftStatusField, next: boolean) => {
    setStatusError(null);

    if (field === 'bought' && !next && (gift.wrapped || gift.sent)) {
      setUnbuyTarget(gift);
      return;
    }

    const patch =
      field === 'bought'
        ? { bought: next }
        : field === 'wrapped'
          ? { wrapped: next }
          : { sent: next };

    setStatusBusyId(gift.id);
    try {
      await repositories.gifts.setPurchaseState(gift.id, patch);
    } catch (error) {
      setStatusError(
        errorMessageFrom(error, 'The gift status could not be changed. Your data is unchanged.'),
      );
    } finally {
      setStatusBusyId(null);
    }
  };

  const headerActions = (
    <>
      <Link className={buttonStyles({ variant: 'secondary' })} to="/recipients">
        <ArrowLeft size={17} aria-hidden="true" />
        All recipients
      </Link>
      {canEdit ? (
        <Button onClick={() => setEditRecipientOpen(true)}>
          <Pencil size={17} aria-hidden="true" />
          Edit recipient
        </Button>
      ) : null}
    </>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="People"
        title={recipient.name}
        description={`${relationship}${season.name} · ${seasonDate}`}
        badge={
          archived ? (
            <Badge tone="neutral">Archived — read only</Badge>
          ) : metrics.overCap ? (
            <Badge tone="burgundy">Over cap</Badge>
          ) : (
            <Badge tone="gold">
              {metrics.giftCount} {metrics.giftCount === 1 ? 'gift' : 'gifts'}
            </Badge>
          )
        }
        actions={headerActions}
      />

      <h2 className="sr-only">Recipient totals and gifts</h2>

      {notice ? (
        <p className={styles.notice} role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}

      {statusError ? (
        <p className={styles.errorNotice} role="alert">
          {statusError}
        </p>
      ) : null}

      {archived ? (
        <div className={styles.archivedBanner} role="status">
          <span className={styles.archivedIcon} aria-hidden="true">
            <CalendarDays size={18} />
          </span>
          <div>
            <strong>{season.name} is archived.</strong>
            <p>
              {seasonDate} · Recipient details and gifts are read-only. Restore the season to make
              changes.
            </p>
          </div>
        </div>
      ) : null}

      <section className={styles.metricsGrid} aria-label="Recipient totals">
        <Card>
          <CardContent className={styles.metricCard}>
            <span className={styles.metricLabel}>Budget cap</span>
            <strong className={styles.metricValue}>
              {metrics.capMinor === null ? 'No cap' : money(metrics.capMinor, settings)}
            </strong>
            <span className={styles.metricNote}>
              {metrics.capMinor === null
                ? 'No cap is set.'
                : 'The most this recipient should cost.'}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={styles.metricCard}>
            <span className={styles.metricLabel}>Planned</span>
            <strong className={styles.metricValue}>{money(metrics.plannedMinor, settings)}</strong>
            <span className={styles.metricNote}>Planned budgets across all their gifts.</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={styles.metricCard}>
            <span className={styles.metricLabel}>Spent</span>
            <strong className={styles.metricValue}>{money(metrics.spentMinor, settings)}</strong>
            <span className={styles.metricNote}>Actual cost of bought gifts only.</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={styles.metricCard}>
            <div className={styles.metricLabelRow}>
              <span className={styles.metricLabel}>Cap left</span>
              <InfoTip label="cap left">
                The budget cap minus the actual cost of bought gifts. Planned gifts do not reduce it
                until they are bought.
              </InfoTip>
            </div>
            <strong
              className={`${styles.metricValue} ${metrics.overCap ? styles.metricValueOver : ''}`}
            >
              {metrics.capMinor === null ? 'No cap' : money(metrics.remainingCapMinor, settings)}
            </strong>
            <span className={styles.metricNote}>
              {metrics.capMinor === null
                ? 'No cap is set.'
                : metrics.overCap
                  ? `Over cap by ${money(metrics.capExceededByMinor, settings)}.`
                  : 'Available under the cap.'}
            </span>
          </CardContent>
        </Card>
      </section>

      <div className={styles.insightsGrid}>
        <Card>
          <CardHeader>
            <CardTitle>Cap utilisation</CardTitle>
            <CardDescription>How much of this recipient&apos;s cap is used.</CardDescription>
          </CardHeader>
          <CardContent className={styles.capContent}>
            <div className={styles.capTop}>
              <span className={styles.capPercent}>{utilizationText(metrics)}</span>
              {metrics.overCap ? (
                <Badge tone="burgundy">
                  <TriangleAlert size={14} aria-hidden="true" />
                  Over cap
                </Badge>
              ) : null}
            </div>
            {capWidth === null ? null : (
              <div
                className={styles.capTrack}
                role="progressbar"
                aria-label="Cap used"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={capWidth}
              >
                <span
                  className={`${styles.capFill} ${metrics.overCap ? styles.capFillOver : ''}`}
                  style={{ width: `${capWidth}%` }}
                />
              </div>
            )}
            <p className={styles.capSummary}>{capSummary(metrics, settings)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gift progress</CardTitle>
            <CardDescription>Bought, wrapped, and sent counts for their gifts.</CardDescription>
          </CardHeader>
          <CardContent>
            {progress.total === 0 ? (
              <p className={styles.noProgress}>
                No gifts yet. Progress will appear here once this recipient has gifts.
              </p>
            ) : (
              <div className={styles.progressList}>
                <ProgressRow
                  icon={<ShoppingBag size={16} />}
                  label="Bought"
                  count={progress.bought}
                  total={progress.total}
                  ratio={progress.boughtRatio}
                />
                <ProgressRow
                  icon={<PackageCheck size={16} />}
                  label="Wrapped"
                  count={progress.wrapped}
                  total={progress.total}
                  ratio={progress.wrappedRatio}
                />
                <ProgressRow
                  icon={<Send size={16} />}
                  label="Sent"
                  count={progress.sent}
                  total={progress.total}
                  ratio={progress.sentRatio}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {recipient.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.notes}>{recipient.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Gifts for {recipient.name}</CardTitle>
          <CardDescription>
            {recipientGifts.length === 0
              ? 'No gifts are recorded for this recipient yet.'
              : 'The same gift statuses and totals used across the app.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recipientGifts.length === 0 ? (
            <EmptyState
              icon={<GiftIcon />}
              title="No gifts for this recipient yet"
              description="Gifts are added from the Gifts page and always belong to a recipient in this season."
              action={
                <Link className={buttonStyles({ variant: 'secondary' })} to="/gifts">
                  Go to gifts
                </Link>
              }
            />
          ) : (
            <GiftTable
              gifts={recipientGifts}
              recipientMap={recipientMap}
              settings={settings}
              readOnly={!canEdit}
              busyGiftId={statusBusyId}
              highlightedGiftId={null}
              onEdit={setFormGift}
              onDelete={setDeleteTarget}
              onQuickStatus={(gift, field, next) => {
                void handleQuickStatus(gift, field, next);
              }}
            />
          )}
        </CardContent>
      </Card>

      {formGift !== undefined && canEdit ? (
        <GiftFormDialog
          gift={formGift}
          season={season}
          recipients={recipients}
          settings={settings}
          onClose={() => setFormGift(undefined)}
          onSaved={(message) => {
            setFormGift(undefined);
            setNotice(message);
          }}
        />
      ) : null}

      {deleteTarget && canEdit ? (
        <DeleteGiftDialog
          gift={deleteTarget}
          recipient={recipient}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(message) => {
            focusMainAfterNoticeRef.current = true;
            setDeleteTarget(null);
            setNotice(message);
          }}
        />
      ) : null}

      {unbuyTarget && canEdit ? (
        <UnbuyGiftDialog
          gift={unbuyTarget}
          onClose={() => setUnbuyTarget(null)}
          onUnbought={(message) => {
            setUnbuyTarget(null);
            setNotice(message);
          }}
        />
      ) : null}

      {editRecipientOpen && canEdit ? (
        <RecipientFormDialog
          recipient={recipient}
          season={season}
          settings={settings}
          onClose={() => setEditRecipientOpen(false)}
          onSaved={(message) => {
            setEditRecipientOpen(false);
            setNotice(message);
          }}
        />
      ) : null}
    </div>
  );
}
