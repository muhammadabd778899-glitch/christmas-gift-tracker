import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { GiftFilters, GiftTriState } from '../../domain/calculations/giftList';
import type { Recipient } from '../../domain/entities';
import { GIFT_SORT_OPTIONS } from './giftListOptions';
import styles from './GiftFilterBar.module.css';

interface GiftFilterBarProps {
  filters: GiftFilters;
  sortValue: string;
  categories: readonly string[];
  recipients: readonly Recipient[];
  resultCount: number;
  totalCount: number;
  active: boolean;
  onChange: (patch: Partial<GiftFilters>) => void;
  onSortChange: (value: string) => void;
  onClearAll: () => void;
}

const TRI_STATE_OPTIONS: ReadonlyArray<{ value: GiftTriState; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

function summaryText(resultCount: number, totalCount: number): string {
  if (totalCount === 0) return 'No gifts to show';
  if (resultCount === totalCount) {
    return `All ${totalCount} ${totalCount === 1 ? 'gift' : 'gifts'} shown`;
  }
  return `${resultCount} of ${totalCount} gifts shown`;
}

export function GiftFilterBar({
  filters,
  sortValue,
  categories,
  recipients,
  resultCount,
  totalCount,
  active,
  onChange,
  onSortChange,
  onClearAll,
}: GiftFilterBarProps) {
  const categoryOptions =
    filters.category && !categories.includes(filters.category)
      ? [...categories, filters.category]
      : categories;
  const selectedRecipientMissing =
    filters.recipientId !== null &&
    !recipients.some((recipient) => recipient.id === filters.recipientId);

  return (
    <div className={styles.filters} role="search" aria-label="Gift filters" data-print-hide>
      <div className={styles.topRow}>
        <Input
          label="Search gifts"
          hint="Matches gift name, recipient, category, or store. Case and accents are ignored."
          type="search"
          placeholder="Name, recipient, category, or store"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          containerClassName={styles.search}
        />
        <Select
          label="Sort by"
          value={sortValue}
          onChange={(event) => onSortChange(event.target.value)}
        >
          {GIFT_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className={styles.filterGrid}>
        <Select
          label="Recipient"
          value={filters.recipientId ?? ''}
          onChange={(event) => onChange({ recipientId: event.target.value || null })}
        >
          <option value="">All recipients</option>
          {selectedRecipientMissing ? (
            <option value={filters.recipientId ?? ''}>Recipient no longer available</option>
          ) : null}
          {recipients.map((recipient) => (
            <option key={recipient.id} value={recipient.id}>
              {recipient.name}
            </option>
          ))}
        </Select>

        <Select
          label="Category"
          value={filters.category ?? ''}
          onChange={(event) => onChange({ category: event.target.value || null })}
        >
          <option value="">All categories</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>

        <Select
          label="Bought"
          value={filters.bought}
          onChange={(event) => onChange({ bought: event.target.value as GiftTriState })}
        >
          {TRI_STATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          label="Wrapped"
          value={filters.wrapped}
          onChange={(event) => onChange({ wrapped: event.target.value as GiftTriState })}
        >
          {TRI_STATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          label="Sent"
          value={filters.sent}
          onChange={(event) => onChange({ sent: event.target.value as GiftTriState })}
        >
          {TRI_STATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className={styles.footer}>
        <p className={styles.summary} role="status" aria-live="polite">
          {summaryText(resultCount, totalCount)}
        </p>
        <Button variant="ghost" size="sm" onClick={onClearAll} disabled={!active}>
          Clear all
        </Button>
      </div>
    </div>
  );
}
