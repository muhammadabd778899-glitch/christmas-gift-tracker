import { describe, expect, it } from 'vitest';
import type { Gift } from '../entities';
import { makeGift, makeRecipient } from '../../test/fixtures';
import { buildShoppingList, NO_STORE_LABEL } from './shopping';

function gift(id: string, overrides: Partial<Gift> = {}): Gift {
  return makeGift({ id: id as Gift['id'], ...overrides });
}

describe('buildShoppingList', () => {
  it('returns an empty list when there are no gifts', () => {
    expect(buildShoppingList([], [])).toEqual({ groups: [], itemCount: 0, totalMinor: 0 });
  });

  it('excludes bought gifts and keeps unbought gifts only', () => {
    const list = buildShoppingList(
      [
        gift('33333333-3333-4333-8333-000000000001', {
          name: 'Bought gift',
          bought: true,
          plannedBudgetMinor: 5000,
        }),
        gift('33333333-3333-4333-8333-000000000002', {
          name: 'Still to buy',
          plannedBudgetMinor: 2500,
        }),
      ],
      [],
    );

    expect(list.itemCount).toBe(1);
    expect(list.groups[0].items[0].gift.name).toBe('Still to buy');
    expect(list.totalMinor).toBe(2500);
  });

  it('groups stores case-insensitively and puts the missing store last', () => {
    const list = buildShoppingList(
      [
        gift('33333333-3333-4333-8333-000000000001', {
          name: 'Book',
          store: 'Bookshop',
        }),
        gift('33333333-3333-4333-8333-000000000002', {
          name: 'Candle',
          store: null,
        }),
        gift('33333333-3333-4333-8333-000000000003', {
          name: 'Notebook',
          store: 'bookshop',
        }),
      ],
      [],
    );

    expect(list.groups).toHaveLength(2);
    expect(list.groups[0].label).toBe('Bookshop');
    expect(list.groups[0].items).toHaveLength(2);
    expect(list.groups[1].label).toBe(NO_STORE_LABEL);
    expect(list.groups[1].isNoStore).toBe(true);
  });

  it('sorts named stores alphabetically and rows by gift name', () => {
    const list = buildShoppingList(
      [
        gift('33333333-3333-4333-8333-000000000001', { name: 'Zebra', store: 'Zoo shop' }),
        gift('33333333-3333-4333-8333-000000000002', { name: 'Apple', store: 'Market' }),
        gift('33333333-3333-4333-8333-000000000003', { name: 'Mango', store: 'Market' }),
      ],
      [],
    );

    expect(list.groups.map((group) => group.label)).toEqual(['Market', 'Zoo shop']);
    expect(list.groups[0].items.map((item) => item.gift.name)).toEqual(['Apple', 'Mango']);
  });

  it('sums group subtotals and the visible total, treating null planned budgets as zero', () => {
    const list = buildShoppingList(
      [
        gift('33333333-3333-4333-8333-000000000001', {
          name: 'One',
          store: 'Shop',
          plannedBudgetMinor: 1200,
        }),
        gift('33333333-3333-4333-8333-000000000002', {
          name: 'Two',
          store: 'Shop',
          plannedBudgetMinor: null,
        }),
        gift('33333333-3333-4333-8333-000000000003', {
          name: 'Three',
          store: null,
          plannedBudgetMinor: 800,
        }),
      ],
      [],
    );

    expect(list.groups[0].subtotalMinor).toBe(1200);
    expect(list.groups[1].subtotalMinor).toBe(800);
    expect(list.totalMinor).toBe(2000);
  });

  it('attaches the recipient without changing the gift record', () => {
    const recipient = makeRecipient({ name: 'Alex' });
    const item = gift('33333333-3333-4333-8333-000000000001', {
      recipientId: recipient.id,
    });
    const list = buildShoppingList([item], [recipient]);

    expect(list.groups[0].items[0].recipient?.name).toBe('Alex');
    expect(list.groups[0].items[0].gift).toBe(item);
    expect(item.bought).toBe(false);
  });
});
