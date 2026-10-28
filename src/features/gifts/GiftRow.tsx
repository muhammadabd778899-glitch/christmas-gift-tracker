import { ExternalLink, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import type { AppSettings, Gift, Recipient } from '../../domain/entities';
import { formatDateOnly } from '../../domain/dates';
import { formatMoney } from '../../domain/money';
import { GiftStatusBadge } from './GiftStatusBadge';
import styles from './GiftRow.module.css';

export type GiftStatusField = 'bought' | 'wrapped' | 'sent';

interface GiftRowProps {
  gift: Gift;
  recipient: Recipient | undefined;
  settings: AppSettings;
  readOnly: boolean;
  busy?: boolean;
  highlighted?: boolean;
  onEdit: (gift: Gift) => void;
  onDelete: (gift: Gift) => void;
  onQuickStatus: (gift: Gift, field: GiftStatusField, next: boolean) => void;
}

function recipientName(recipient: Recipient | undefined): string {
  return recipient?.name ?? '—';
}

export function GiftRow({
  gift,
  recipient,
  settings,
  readOnly,
  busy = false,
  highlighted = false,
  onEdit,
  onDelete,
  onQuickStatus,
}: GiftRowProps) {
  const money = (value: number | null) =>
    formatMoney(value, {
      fractionDigits: settings.fractionDigits,
      currencySymbol: settings.currencySymbol,
      locale: settings.locale,
    });

  const statusDates = [
    gift.bought && gift.boughtOn
      ? `Bought ${formatDateOnly(gift.boughtOn, settings.locale)}`
      : null,
    gift.wrapped && gift.wrappedOn
      ? `Wrapped ${formatDateOnly(gift.wrappedOn, settings.locale)}`
      : null,
    gift.sent && gift.sentOn ? `Sent ${formatDateOnly(gift.sentOn, settings.locale)}` : null,
  ].filter((label): label is string => label !== null);

  return (
    <tr
      id={`gift-${gift.id}`}
      className={styles.row}
      aria-busy={busy || undefined}
      data-highlighted={highlighted || undefined}
      tabIndex={-1}
    >
      {/* Gift name + optional link */}
      <td className={styles.nameCell}>
        <span className={styles.giftName}>{gift.name}</span>
        {gift.purchaseUrl ? (
          <a
            href={gift.purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.purchaseLink}
            aria-label={`Open purchase link for ${gift.name}`}
          >
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : null}
        {gift.category ? <span className={styles.categoryPill}>{gift.category}</span> : null}
      </td>

      {/* Recipient */}
      <td className={styles.recipientCell}>{recipientName(recipient)}</td>

      {/* Store */}
      <td className={styles.storeCell}>{gift.store ?? <span className={styles.empty}>—</span>}</td>

      {/* Planned budget */}
      <td className={styles.moneyCell}>{money(gift.plannedBudgetMinor)}</td>

      {/* Actual cost, with an explicit flag when bought without a cost */}
      <td className={styles.moneyCell}>
        <span className={styles.moneyValue}>{money(gift.actualCostMinor)}</span>
        {gift.bought && gift.actualCostMinor === null ? (
          <span
            className={styles.missingCost}
            title="This gift is marked bought without an actual cost, so it counts as zero spending."
          >
            <TriangleAlert size={12} aria-hidden="true" />
            Cost missing
          </span>
        ) : null}
      </td>

      {/* Status badge + recorded dates */}
      <td className={styles.statusCell}>
        <GiftStatusBadge gift={gift} />
        {statusDates.length > 0 ? (
          <span className={styles.statusDates}>{statusDates.join(' · ')}</span>
        ) : null}
      </td>

      {/* Quick-toggle checkboxes */}
      {readOnly ? null : (
        <td className={styles.toggleCell}>
          <div className={styles.toggles} aria-busy={busy || undefined}>
            <label className={styles.toggleLabel} title="Bought">
              <input
                type="checkbox"
                checked={gift.bought}
                onChange={(e) => onQuickStatus(gift, 'bought', e.target.checked)}
                disabled={busy}
                aria-label={`Mark ${gift.name} as bought`}
                className={styles.checkbox}
              />
              <span aria-hidden="true">Bought</span>
            </label>
            <label
              className={`${styles.toggleLabel} ${!gift.bought ? styles.toggleDisabled : ''}`}
              title={gift.bought ? 'Wrapped' : 'Mark as bought first'}
            >
              <input
                type="checkbox"
                checked={gift.wrapped}
                onChange={(e) => onQuickStatus(gift, 'wrapped', e.target.checked)}
                disabled={!gift.bought || busy}
                aria-label={`Mark ${gift.name} as wrapped`}
                className={styles.checkbox}
              />
              <span aria-hidden="true">Wrapped</span>
            </label>
            <label
              className={`${styles.toggleLabel} ${!gift.bought ? styles.toggleDisabled : ''}`}
              title={gift.bought ? 'Sent' : 'Mark as bought first'}
            >
              <input
                type="checkbox"
                checked={gift.sent}
                onChange={(e) => onQuickStatus(gift, 'sent', e.target.checked)}
                disabled={!gift.bought || busy}
                aria-label={`Mark ${gift.name} as sent`}
                className={styles.checkbox}
              />
              <span aria-hidden="true">Sent</span>
            </label>
          </div>
        </td>
      )}

      {/* Actions */}
      {readOnly ? null : (
        <td className={styles.actionsCell}>
          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(gift)}
              aria-label={`Edit ${gift.name}`}
            >
              <Pencil size={14} aria-hidden="true" />
              Edit
            </Button>
            <IconButton
              icon={<Trash2 size={15} />}
              label={`Delete ${gift.name}`}
              onClick={() => onDelete(gift)}
              className={styles.deleteButton}
            />
          </div>
        </td>
      )}
    </tr>
  );
}
