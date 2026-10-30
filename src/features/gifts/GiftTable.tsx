import { Table, TableBody, TableHead, TableHeaderCell, TableRow } from '../../components/ui/Table';
import type { AppSettings, Gift, Recipient } from '../../domain/entities';
import { GiftRow, type GiftStatusField } from './GiftRow';
import styles from './GiftTable.module.css';

interface GiftTableProps {
  gifts: readonly Gift[];
  recipientMap: ReadonlyMap<string, Recipient>;
  settings: AppSettings;
  readOnly: boolean;
  busyGiftId: string | null;
  highlightedGiftId: string | null;
  onEdit: (gift: Gift) => void;
  onDelete: (gift: Gift) => void;
  onQuickStatus: (gift: Gift, field: GiftStatusField, next: boolean) => void;
}

export function GiftTable({
  gifts,
  recipientMap,
  settings,
  readOnly,
  busyGiftId,
  highlightedGiftId,
  onEdit,
  onDelete,
  onQuickStatus,
}: GiftTableProps) {
  return (
    <Table label="Gift list" className={styles.giftTable}>
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
            highlighted={highlightedGiftId === gift.id}
            onEdit={onEdit}
            onDelete={onDelete}
            onQuickStatus={onQuickStatus}
          />
        ))}
      </TableBody>
    </Table>
  );
}
