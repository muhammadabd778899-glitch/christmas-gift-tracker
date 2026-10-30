import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../components/ui/Table';
import { useLiveQueryState } from '../../app/providers/useLiveQueryState';
import { useRepositories } from '../../app/providers/storageContext';
import { calculateSeasonTotals } from '../../domain/calculations/dashboard';
import { formatDateOnly } from '../../domain/dates';
import type { AppSettings, Gift, Season } from '../../domain/entities';
import { formatMoney } from '../../domain/money';
import styles from './SeasonDialogs.module.css';

interface SeasonPreviewDialogProps {
  season: Season;
  settings: AppSettings;
  onClose: () => void;
}

function giftStatus(gift: Gift): string {
  const states: string[] = [];
  if (gift.bought) states.push('Bought');
  if (gift.wrapped) states.push('Wrapped');
  if (gift.sent) states.push('Sent');
  return states.length > 0 ? states.join(' · ') : 'Planned';
}

export function SeasonPreviewDialog({ season, settings, onClose }: SeasonPreviewDialogProps) {
  const repositories = useRepositories();
  const data = useLiveQueryState(async () => {
    const [recipients, gifts, ideas] = await Promise.all([
      repositories.recipients.listBySeason(season.id),
      repositories.gifts.listBySeason(season.id),
      repositories.ideas.listBySeason(season.id),
    ]);

    return { recipients, gifts, ideas };
  }, [repositories, season.id]);

  const money = (value: number | null) =>
    formatMoney(value, {
      fractionDigits: settings.fractionDigits,
      currencySymbol: settings.currencySymbol,
      locale: settings.locale,
    });

  const payload = data.data;
  const totals = payload ? calculateSeasonTotals(season, payload.gifts) : null;
  const recipientsById = new Map(
    (payload?.recipients ?? []).map((recipient) => [recipient.id, recipient]),
  );
  const plannedByRecipient = new Map<string, number>();
  const spentByRecipient = new Map<string, number>();

  for (const gift of payload?.gifts ?? []) {
    if (gift.plannedBudgetMinor !== null) {
      plannedByRecipient.set(
        gift.recipientId,
        (plannedByRecipient.get(gift.recipientId) ?? 0) + gift.plannedBudgetMinor,
      );
    }
    if (gift.bought && gift.actualCostMinor !== null) {
      spentByRecipient.set(
        gift.recipientId,
        (spentByRecipient.get(gift.recipientId) ?? 0) + gift.actualCostMinor,
      );
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={season.name}
      description={`${season.status === 'archived' ? 'Archived' : 'Active'} season · ${formatDateOnly(
        season.holidayDate,
        settings.locale,
      )}. This view is read-only.`}
      className={styles.previewDialog}
      footer={
        <Badge tone="neutral">
          {season.isSample ? 'Sample data · read only' : 'Archived record · read only'}
        </Badge>
      }
    >
      {data.loading ? (
        <p className={styles.status} role="status">
          Loading the archived records…
        </p>
      ) : data.error || !payload || !totals ? (
        <p className={styles.formError} role="alert">
          This season&apos;s records could not be loaded. Reload the app and try again. Nothing has
          been changed.
        </p>
      ) : payload.gifts.length === 0 ? (
        <p className={styles.simpleNote}>
          This season has {payload.recipients.length} recipients and no gifts. There are no costs to
          show.
        </p>
      ) : (
        <div className={styles.previewBody}>
          <dl className={styles.previewTotals}>
            <div>
              <dt>Budget</dt>
              <dd>{money(totals.budgetMinor)}</dd>
            </div>
            <div>
              <dt>Planned</dt>
              <dd>{money(totals.plannedTotalMinor)}</dd>
            </div>
            <div>
              <dt>Actual</dt>
              <dd>{money(totals.actualSpentMinor)}</dd>
            </div>
            <div>
              <dt>Records</dt>
              <dd>
                {payload.gifts.length} gifts · {payload.ideas.length} ideas
              </dd>
            </div>
          </dl>

          <section className={styles.previewSection} aria-labelledby="preview-recipients">
            <h3 id="preview-recipients">Recipients</h3>
            <Table label={`Recipients in ${season.name}`}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Relationship</TableHeaderCell>
                  <TableHeaderCell>Planned</TableHeaderCell>
                  <TableHeaderCell>Actual</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payload.recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell>{recipient.name}</TableCell>
                    <TableCell>{recipient.relationship ?? '—'}</TableCell>
                    <TableCell>{money(plannedByRecipient.get(recipient.id) ?? 0)}</TableCell>
                    <TableCell>{money(spentByRecipient.get(recipient.id) ?? 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className={styles.previewSection} aria-labelledby="preview-gifts">
            <h3 id="preview-gifts">Gifts</h3>
            <Table label={`Gifts in ${season.name}`}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Gift</TableHeaderCell>
                  <TableHeaderCell>Recipient</TableHeaderCell>
                  <TableHeaderCell>Planned</TableHeaderCell>
                  <TableHeaderCell>Actual</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payload.gifts.map((gift) => (
                  <TableRow key={gift.id}>
                    <TableCell>{gift.name}</TableCell>
                    <TableCell>{recipientsById.get(gift.recipientId)?.name ?? '—'}</TableCell>
                    <TableCell>{money(gift.plannedBudgetMinor)}</TableCell>
                    <TableCell>{money(gift.actualCostMinor)}</TableCell>
                    <TableCell>{giftStatus(gift)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </div>
      )}
    </Dialog>
  );
}
