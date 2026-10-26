import { Gift, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import type { AppSettings, Recipient } from '../../domain/entities';
import { formatMoney } from '../../domain/money';
import type { RecipientMetrics } from '../../domain/calculations/recipients';
import styles from './RecipientCard.module.css';

interface RecipientCardProps {
  recipient: Recipient;
  metrics: RecipientMetrics;
  settings: AppSettings;
  readOnly: boolean;
  onEdit: (recipient: Recipient) => void;
  onDelete: (recipient: Recipient) => void;
}

function displayName(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function progressLabel(metrics: RecipientMetrics): string {
  if (metrics.capMinor === null) return 'No cap set';
  if (metrics.capMinor === 0) return 'Zero cap';
  const percent = `${Math.round((metrics.utilization ?? 0) * 100)}% of cap used`;
  return metrics.overCap ? `Over cap · ${percent}` : percent;
}

export function RecipientCard({
  recipient,
  metrics,
  settings,
  readOnly,
  onEdit,
  onDelete,
}: RecipientCardProps) {
  const money = (value: number | null) =>
    formatMoney(value, {
      fractionDigits: settings.fractionDigits,
      currencySymbol: settings.currencySymbol,
      locale: settings.locale,
    });
  const progressPercent =
    metrics.utilization === null ? null : Math.min(100, Math.max(0, metrics.utilization * 100));
  const giftLabel =
    metrics.giftCount === 0
      ? 'No gifts yet'
      : `${metrics.giftCount} ${metrics.giftCount === 1 ? 'gift' : 'gifts'}`;
  const capBadge =
    metrics.capMinor === null ? (
      <Badge tone="outline">No cap</Badge>
    ) : metrics.capMinor === 0 ? (
      <Badge tone="neutral">Zero cap</Badge>
    ) : metrics.overCap ? (
      <Badge tone="burgundy">Over cap</Badge>
    ) : (
      <Badge tone="evergreen">Within cap</Badge>
    );

  return (
    <Card className={styles.card}>
      <CardContent className={styles.content}>
        <div className={styles.top}>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">
              {displayName(recipient.name)}
            </span>
            <div className={styles.nameBlock}>
              <h2 className={styles.name}>{recipient.name}</h2>
              <p className={styles.relationship}>
                {recipient.relationship ?? 'Relationship not set'}
              </p>
            </div>
          </div>
          {capBadge}
        </div>

        <dl className={styles.moneyGrid}>
          <div>
            <dt>Planned</dt>
            <dd>{money(metrics.plannedMinor)}</dd>
          </div>
          <div>
            <dt>Spent</dt>
            <dd className={metrics.overCap ? styles.overCapText : undefined}>
              {money(metrics.spentMinor)}
            </dd>
          </div>
          <div>
            <dt>Cap left</dt>
            <dd className={metrics.overCap ? styles.overCapText : undefined}>
              {money(metrics.remainingCapMinor)}
            </dd>
          </div>
        </dl>

        <div className={styles.progressBlock}>
          <div className={styles.progressTop}>
            <span>{progressLabel(metrics)}</span>
            <span>{metrics.capMinor === null ? 'No cap' : `Cap ${money(metrics.capMinor)}`}</span>
          </div>
          {progressPercent === null ? (
            <p className={styles.progressNote}>
              {metrics.capMinor === null
                ? 'Add a cap to see utilization. Planned and spent still count.'
                : 'A zero cap intentionally allows no spending.'}
            </p>
          ) : (
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label={`${recipient.name} budget cap used`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPercent)}
              aria-valuetext={progressLabel(metrics)}
            >
              <span
                className={styles.progressFill}
                data-over={metrics.overCap || undefined}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
          {metrics.overCap ? (
            <p className={styles.overCapNote}>Over cap by {money(metrics.capExceededByMinor)}</p>
          ) : null}
        </div>

        {recipient.notes ? <p className={styles.notes}>{recipient.notes}</p> : null}

        <div className={styles.footer}>
          <span className={styles.giftCount}>
            <Gift size={14} aria-hidden="true" />
            {giftLabel}
          </span>
          {readOnly ? (
            <span className={styles.readOnlyLabel}>Archived · read only</span>
          ) : (
            <div className={styles.actions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(recipient)}
                aria-label={`Edit ${recipient.name}`}
              >
                <Pencil size={14} aria-hidden="true" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={styles.deleteButton}
                onClick={() => onDelete(recipient)}
                aria-label={`Delete ${recipient.name}`}
              >
                <Trash2 size={14} aria-hidden="true" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
