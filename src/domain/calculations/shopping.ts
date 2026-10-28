import type { Gift, MinorUnits, Recipient } from '../entities';

export interface ShoppingItem {
  gift: Gift;
  recipient: Recipient | null;
}

export interface ShoppingGroup {
  key: string;
  label: string;
  isNoStore: boolean;
  items: ShoppingItem[];
  subtotalMinor: MinorUnits;
}

export interface ShoppingList {
  groups: ShoppingGroup[];
  itemCount: number;
  totalMinor: MinorUnits;
}

const NO_STORE_KEY = '__no_store__';
export const NO_STORE_LABEL = 'No store specified';

function storeKey(store: string | null): string {
  const trimmed = store?.trim();
  return trimmed ? trimmed.toLocaleLowerCase() : NO_STORE_KEY;
}

function planned(gift: Gift): MinorUnits {
  return gift.plannedBudgetMinor ?? 0;
}

function compareNames(left: string | null | undefined, right: string | null | undefined): number {
  return (left ?? '').localeCompare(right ?? '', undefined, { sensitivity: 'base' });
}

/**
 * Build the shopping list from unbought gifts only. Nothing is stored: the
 * list is a projection of the season's gift records.
 */
export function buildShoppingList(
  gifts: readonly Gift[],
  recipients: readonly Recipient[],
): ShoppingList {
  const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
  const groupMap = new Map<string, ShoppingGroup>();

  for (const gift of gifts) {
    if (gift.bought) {
      continue;
    }

    const key = storeKey(gift.store);
    const existing = groupMap.get(key);

    if (existing) {
      existing.items.push({ gift, recipient: recipientsById.get(gift.recipientId) ?? null });
      existing.subtotalMinor += planned(gift);
      continue;
    }

    groupMap.set(key, {
      key,
      label: gift.store?.trim() || NO_STORE_LABEL,
      isNoStore: key === NO_STORE_KEY,
      items: [{ gift, recipient: recipientsById.get(gift.recipientId) ?? null }],
      subtotalMinor: planned(gift),
    });
  }

  const groups = [...groupMap.values()];

  for (const group of groups) {
    group.items.sort(
      (left, right) =>
        compareNames(left.gift.name, right.gift.name) ||
        compareNames(left.recipient?.name, right.recipient?.name) ||
        left.gift.id.localeCompare(right.gift.id),
    );
  }

  groups.sort((left, right) => {
    if (left.isNoStore !== right.isNoStore) {
      return left.isNoStore ? 1 : -1;
    }

    return compareNames(left.label, right.label) || left.key.localeCompare(right.key);
  });

  return {
    groups,
    itemCount: groups.reduce((count, group) => count + group.items.length, 0),
    totalMinor: groups.reduce((total, group) => total + group.subtotalMinor, 0),
  };
}
