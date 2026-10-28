import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Gift, Plus, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, TableBody, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table';
import { buttonStyles } from '../components/ui/buttonStyles';
import { formatDateOnly } from '../domain/dates';
import { toAppError } from '../storage/errors';
import { errorMessageFrom } from '../lib/formErrors';
import { DeleteGiftDialog } from '../features/gifts/DeleteGiftDialog';
import { GiftFormDialog } from '../features/gifts/GiftFormDialog';
import { GiftRow, type GiftStatusField } from '../features/gifts/GiftRow';
import { UnbuyGiftDialog } from '../features/gifts/UnbuyGiftDialog';
import { useGiftPageData } from '../features/gifts/useGiftPageData';
import { useRepositories } from '../app/providers/storageContext';
import type { AppSettings, Gift as GiftEntity, Recipient } from '../domain/entities';
import styles from './GiftsPage.module.css';

interface GiftsLocationState {
  notice?: string;
}

export function GiftsPage() {
  const location = useLocation();
  const data = useGiftPageData();
  const repositories = useRepositories();
  const [formGift, setFormGift] = useState<GiftEntity | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<GiftEntity | null>(null);
  const [unbuyTarget, setUnbuyTarget] = useState<GiftEntity | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    (location.state as GiftsLocationState | null)?.notice ?? null,
  );
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
          eyebrow="Shopping"
          title="Gifts"
          description="Every planned and purchased gift in one organised list."
        />
        <div className={styles.skeletonWrap} role="status" aria-live="polite">
          <span className="sr-only">Loading gifts…</span>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonRow} aria-hidden="true">
              <span className={styles.skeletonCell} style={{ width: '40%' }} />
              <span className={styles.skeletonCell} style={{ width: '20%' }} />
              <span className={styles.skeletonCell} style={{ width: '15%' }} />
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
        title="Your gifts could not be loaded."
        description={
          appError.recovery ??
          'Your data has not been deleted. Reload the app and try again. If the problem continues, do not clear site data.'
        }
        actions={<Button onClick={() => window.location.reload()}>Reload app</Button>}
      />
    );
  }

  const { settings, season, recipients, gifts } = data.data;
  const archived = season?.status === 'archived';
  const canEdit = season !== null && !archived;
  const canAddGift = canEdit && recipients.length > 0;
  const seasonDate = season ? formatDateOnly(season.holidayDate, settings.locale) : null;

  // Build a fast lookup map for recipient names
  const recipientMap = new Map(recipients.map((r) => [r.id, r]));

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

  const headerActions = canAddGift ? (
    <Button onClick={() => setFormGift(null)}>
      <Plus size={17} aria-hidden="true" />
      Add gift
    </Button>
  ) : undefined;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Shopping"
        title="Gifts"
        description={
          season
            ? `Every gift in ${season.name}. Costs and statuses are tracked here; budgets update in real time.`
            : 'Gifts belong to a season. Create one before adding gifts.'
        }
        badge={
          season ? (
            archived ? (
              <Badge tone="neutral">Archived · read only</Badge>
            ) : (
              <Badge tone="gold">
                {gifts.length} {gifts.length === 1 ? 'gift' : 'gifts'}
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

      {statusError ? (
        <p className={styles.errorNotice} role="alert">
          {statusError}
        </p>
      ) : null}

      {!season ? (
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
      ) : archived ? (
        <>
          <div className={styles.archivedBanner} role="status">
            <span className={styles.archivedIcon} aria-hidden="true">
              <CalendarDays size={18} />
            </span>
            <div>
              <strong>{season.name} is archived.</strong>
              <p>
                {seasonDate} · Gifts are read-only. Restore the season to make changes. Season and
                archive controls arrive in Milestone 8.
              </p>
            </div>
          </div>

          {gifts.length === 0 ? (
            <EmptyState
              icon={<Gift />}
              title="No gifts in this archived season"
              description="This season has no gifts stored."
            />
          ) : (
            <GiftTable
              gifts={gifts}
              recipientMap={recipientMap}
              settings={settings}
              readOnly
              busyGiftId={null}
              onEdit={() => undefined}
              onDelete={() => undefined}
              onQuickStatus={() => undefined}
            />
          )}
        </>
      ) : recipients.length === 0 ? (
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
          </div>

          <EmptyState
            icon={<Users />}
            title="Add a recipient first"
            description={`Every gift belongs to a person in ${season.name}. Add the first recipient, then come back to record the gift.`}
            action={
              <Link className={buttonStyles({ variant: 'primary' })} to="/recipients">
                Add a recipient
              </Link>
            }
          />
        </>
      ) : gifts.length === 0 ? (
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
          </div>

          <EmptyState
            icon={<Gift />}
            title="No gifts yet"
            description={`Add the first gift for ${season.name}. You only need a name and a recipient to start.`}
            action={
              <Button onClick={() => setFormGift(null)}>
                <Plus size={17} aria-hidden="true" />
                Add your first gift
              </Button>
            }
          />
        </>
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
              {gifts.length} {gifts.length === 1 ? 'gift' : 'gifts'}
            </span>
          </div>

          <GiftTable
            gifts={gifts}
            recipientMap={recipientMap}
            settings={settings}
            readOnly={false}
            busyGiftId={statusBusyId}
            onEdit={setFormGift}
            onDelete={setDeleteTarget}
            onQuickStatus={(gift, field, next) => {
              void handleQuickStatus(gift, field, next);
            }}
          />
        </>
      )}

      {formGift !== undefined && season && !archived ? (
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

      {deleteTarget && season && !archived ? (
        <DeleteGiftDialog
          gift={deleteTarget}
          recipient={recipientMap.get(deleteTarget.recipientId)}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(message) => {
            focusMainAfterNoticeRef.current = true;
            setDeleteTarget(null);
            setNotice(message);
          }}
        />
      ) : null}

      {unbuyTarget && season && !archived ? (
        <UnbuyGiftDialog
          gift={unbuyTarget}
          onClose={() => setUnbuyTarget(null)}
          onUnbought={(message) => {
            setUnbuyTarget(null);
            setNotice(message);
          }}
        />
      ) : null}
    </div>
  );
}

// ── Internal table sub-component ──────────────────────────────────────────────

interface GiftTableProps {
  gifts: GiftEntity[];
  recipientMap: Map<string, Recipient>;
  settings: AppSettings;
  readOnly: boolean;
  busyGiftId: string | null;
  onEdit: (gift: GiftEntity) => void;
  onDelete: (gift: GiftEntity) => void;
  onQuickStatus: (gift: GiftEntity, field: GiftStatusField, next: boolean) => void;
}

function GiftTable({
  gifts,
  recipientMap,
  settings,
  readOnly,
  busyGiftId,
  onEdit,
  onDelete,
  onQuickStatus,
}: GiftTableProps) {
  return (
    <Table label="Gift list">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Gift</TableHeaderCell>
          <TableHeaderCell>Recipient</TableHeaderCell>
          <TableHeaderCell>Store</TableHeaderCell>
          <TableHeaderCell>Planned</TableHeaderCell>
          <TableHeaderCell>Actual</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          {readOnly ? null : <TableHeaderCell>Toggle</TableHeaderCell>}
          {readOnly ? null : <TableHeaderCell>Actions</TableHeaderCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {gifts.map((gift) => (
          <GiftRow
            key={gift.id}
            gift={gift}
            recipient={recipientMap.get(gift.recipientId)}
            settings={settings}
            readOnly={readOnly}
            busy={busyGiftId === gift.id}
            onEdit={onEdit}
            onDelete={onDelete}
            onQuickStatus={onQuickStatus}
          />
        ))}
      </TableBody>
    </Table>
  );
}
