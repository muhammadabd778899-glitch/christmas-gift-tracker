import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ExternalLink, Printer, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { PageHeader } from '../components/ui/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/Table';
import { buttonStyles } from '../components/ui/buttonStyles';
import { buildShoppingList } from '../domain/calculations/shopping';
import { formatDateOnly, localToday } from '../domain/dates';
import type { Gift } from '../domain/entities';
import { formatMoney } from '../domain/money';
import { errorMessageFrom } from '../lib/formErrors';
import { toAppError } from '../storage/errors';
import { useRepositories } from '../app/providers/storageContext';
import { useShoppingPageData } from '../features/shopping/useShoppingPageData';
import styles from './ShoppingPage.module.css';

export function ShoppingPage() {
  const data = useShoppingPageData();
  const repositories = useRepositories();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const focusMainAfterNoticeRef = useRef(false);

  useEffect(() => {
    if (!notice) return;

    if (focusMainAfterNoticeRef.current) {
      focusMainAfterNoticeRef.current = false;
      document.getElementById('main-content')?.focus();
    }

    const timer = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (data.loading) {
    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="Out the door"
          title="Shopping List"
          description="Everything still to buy, grouped by store and ready to print."
        />
        <div className={styles.loadingCard} role="status" aria-live="polite">
          <span className={styles.loadingDot} aria-hidden="true" />
          Loading your shopping list…
        </div>
      </div>
    );
  }

  if (data.error || !data.data) {
    const appError = toAppError(data.error);
    return (
      <ErrorState
        title="Your shopping list could not be loaded."
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
  const shopping = buildShoppingList(gifts, recipients);
  const printedDate = formatDateOnly(localToday(), settings.locale);
  const money = (value: number) =>
    formatMoney(value, {
      fractionDigits: settings.fractionDigits,
      currencySymbol: settings.currencySymbol,
      locale: settings.locale,
    });

  const handleMarkBought = async (gift: Gift) => {
    setStatusError(null);
    setBusyId(gift.id);

    try {
      await repositories.gifts.setPurchaseState(gift.id, { bought: true });
      focusMainAfterNoticeRef.current = true;
      setNotice(
        `${gift.name} was marked bought and removed from the list. Add the actual cost in Gifts when you know it.`,
      );
    } catch (error) {
      setStatusError(
        errorMessageFrom(error, 'The gift could not be marked bought. Your data is unchanged.'),
      );
    } finally {
      setBusyId(null);
    }
  };

  const headerActions =
    season && shopping.itemCount > 0 ? (
      <Button variant="secondary" onClick={() => window.print()} data-print-hide>
        <Printer size={17} aria-hidden="true" />
        Print list
      </Button>
    ) : undefined;

  return (
    <div className={styles.page} data-print-root>
      <div className={styles.printHeader}>
        <p className={styles.printEyebrow}>Christmas Gift Tracker</p>
        <h1>Shopping List</h1>
        {season ? (
          <p className={styles.printMeta}>
            {season.name} · Printed {printedDate}
          </p>
        ) : null}
      </div>

      <PageHeader
        eyebrow="Out the door"
        title="Shopping List"
        description={
          season
            ? `Everything still to buy for ${season.name}, grouped by store. This list is generated from unbought gifts and is never stored separately.`
            : 'Create a season and add gifts to build a shopping list.'
        }
        badge={
          season ? (
            archived ? (
              <Badge tone="neutral">Archived · read only</Badge>
            ) : (
              <Badge tone={shopping.itemCount === 0 ? 'success' : 'gold'}>
                {shopping.itemCount === 0
                  ? 'Nothing left to buy'
                  : `${shopping.itemCount} ${shopping.itemCount === 1 ? 'gift' : 'gifts'} to buy`}
              </Badge>
            )
          ) : undefined
        }
        actions={headerActions}
      />

      {notice ? (
        <p className={styles.notice} role="status" aria-live="polite" data-print-hide>
          {notice}
        </p>
      ) : null}

      {statusError ? (
        <p className={styles.errorNotice} role="alert" data-print-hide>
          {statusError}
        </p>
      ) : null}

      {!season ? (
        <EmptyState
          icon={<CalendarDays />}
          title="Create a season first"
          description="A season keeps one Christmas together: its people, gifts, ideas, and budget. Nothing is created for you automatically."
          action={
            <Link className={buttonStyles({ variant: 'primary' })} to="/onboarding">
              Create your first season
            </Link>
          }
        />
      ) : (
        <>
          {archived ? (
            <div className={styles.archivedBanner} role="status" data-print-hide>
              <span className={styles.archivedIcon} aria-hidden="true">
                <CalendarDays size={18} />
              </span>
              <div>
                <strong>{season.name} is archived.</strong>
                <p>
                  This list is read-only, so gifts cannot be marked bought here. Restore the season
                  to make changes. Season and archive controls arrive in Milestone 8.
                </p>
              </div>
            </div>
          ) : null}

          {shopping.itemCount === 0 ? (
            <EmptyState
              icon={<ShoppingBag />}
              title={gifts.length === 0 ? 'No gifts yet' : 'Nothing left to buy'}
              description={
                gifts.length === 0
                  ? `Add gifts to ${season.name}. Unbought gifts appear here automatically, grouped by store.`
                  : `Every gift in ${season.name} is marked bought. If you un-buy one in Gifts, it will return here.`
              }
              action={
                <Link className={buttonStyles({ variant: 'primary' })} to="/gifts">
                  {gifts.length === 0 ? 'Add gifts' : 'Open Gifts'}
                </Link>
              }
            />
          ) : (
            <>
              <div className={styles.summary} data-print-hide>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Gifts to buy</span>
                  <strong>{shopping.itemCount}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Planned total</span>
                  <strong>{money(shopping.totalMinor)}</strong>
                </div>
                <p className={styles.summaryNote}>
                  Planned amounts only. Actual costs are recorded on each gift after purchase.
                </p>
              </div>

              <div className={styles.groups}>
                {shopping.groups.map((group, index) => (
                  <section
                    key={group.key}
                    className={styles.group}
                    aria-labelledby={`store-group-${index}`}
                  >
                    <div className={styles.groupHeader}>
                      <h2 id={`store-group-${index}`} className={styles.groupTitle}>
                        {group.label}
                      </h2>
                      <span className={styles.groupCount}>
                        {group.items.length} {group.items.length === 1 ? 'gift' : 'gifts'}
                      </span>
                    </div>

                    <Table label={`${group.label} shopping items`}>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Gift</TableHeaderCell>
                          <TableHeaderCell>For</TableHeaderCell>
                          <TableHeaderCell>Planned</TableHeaderCell>
                          <TableHeaderCell>Link</TableHeaderCell>
                          <TableHeaderCell>
                            <span className="sr-only">Actions</span>
                          </TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {group.items.map(({ gift, recipient }) => (
                          <TableRow key={gift.id}>
                            <TableCell>
                              <span className={styles.giftName}>{gift.name}</span>
                              {gift.category ? (
                                <span className={styles.category}>{gift.category}</span>
                              ) : null}
                            </TableCell>
                            <TableCell>{recipient?.name ?? '—'}</TableCell>
                            <TableCell className={styles.moneyCell}>
                              {gift.plannedBudgetMinor === null ? (
                                <span className={styles.muted}>Not set</span>
                              ) : (
                                money(gift.plannedBudgetMinor)
                              )}
                            </TableCell>
                            <TableCell>
                              {gift.purchaseUrl ? (
                                <a
                                  className={styles.purchaseLink}
                                  href={gift.purchaseUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Open link: ${gift.name}`}
                                >
                                  <ExternalLink size={14} aria-hidden="true" />
                                  Open
                                </a>
                              ) : (
                                <span className={styles.muted}>—</span>
                              )}
                            </TableCell>
                            <TableCell className={styles.actionCell}>
                              {archived ? (
                                <span className={styles.muted}>Read only</span>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => void handleMarkBought(gift)}
                                  disabled={busyId === gift.id}
                                  aria-label={`Mark bought: ${gift.name}`}
                                  data-print-hide
                                >
                                  {busyId === gift.id ? 'Marking…' : 'Mark bought'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <tr className={styles.subtotalRow}>
                          <td colSpan={2}>Subtotal</td>
                          <td className={styles.moneyCell}>{money(group.subtotalMinor)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </Table>
                  </section>
                ))}
              </div>

              <div className={styles.totalRow}>
                <span>Total planned for this list</span>
                <strong>{money(shopping.totalMinor)}</strong>
              </div>

              <p className={styles.footnote} data-print-hide>
                Marking an item bought removes it immediately and updates your dashboard spending.
                It does not guess an actual cost; add that in Gifts when you know it.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
