import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { GiftCreateInput, RecipientCreateInput, SeasonCreateInput } from '../domain/schemas';
import { createTestStorage, type TestStorage } from '../test/storage';
import { renderApp } from '../test/render';

async function addSeason(storage: TestStorage, overrides: Partial<SeasonCreateInput> = {}) {
  return storage.repositories.seasons.create({
    name: 'Christmas 2026',
    holidayDate: '2026-12-25',
    budgetMinor: 50000,
    ...overrides,
  });
}

async function addRecipient(
  storage: TestStorage,
  seasonId: string,
  name: string,
  overrides: Partial<Omit<RecipientCreateInput, 'seasonId' | 'name'>> = {},
) {
  return storage.repositories.recipients.create({
    seasonId: seasonId as RecipientCreateInput['seasonId'],
    name,
    ...overrides,
  });
}

async function addGift(
  storage: TestStorage,
  seasonId: string,
  recipientId: string,
  overrides: Partial<Omit<GiftCreateInput, 'seasonId' | 'recipientId'>> = {},
) {
  return storage.repositories.gifts.create({
    seasonId: seasonId as GiftCreateInput['seasonId'],
    recipientId: recipientId as GiftCreateInput['recipientId'],
    name: 'Warm scarf',
    ...overrides,
  });
}

function giftRowIds(): string[] {
  return Array.from(document.querySelectorAll<HTMLTableRowElement>('tr[id^="gift-"]')).map((row) =>
    row.id.replace('gift-', ''),
  );
}

async function seedGifts() {
  const storage = await createTestStorage();
  const season = await addSeason(storage);
  const alex = await addRecipient(storage, season.id, 'Alex');
  const bea = await addRecipient(storage, season.id, 'Béa');

  const scarf = await addGift(storage, season.id, alex.id, {
    name: 'Warm scarf',
    category: 'Clothing',
    store: 'Local market',
    plannedBudgetMinor: 2500,
    bought: false,
  });
  const book = await addGift(storage, season.id, bea.id, {
    name: 'Book of walks',
    category: 'Books',
    store: 'Bookshop',
    plannedBudgetMinor: 1800,
    actualCostMinor: 1700,
    bought: true,
    wrapped: true,
  });
  const lamp = await addGift(storage, season.id, alex.id, {
    name: 'Reading lamp',
    category: 'Home',
    store: null,
    plannedBudgetMinor: 4000,
    bought: false,
  });

  return { storage, season, alex, bea, scarf, book, lamp };
}

describe('Gifts page search, filters, and sorting', () => {
  it('searches gift name, recipient, category, and store with forgiving text matching', async () => {
    const user = userEvent.setup();
    const { storage, book, scarf } = await seedGifts();
    await renderApp(['/gifts'], { storage });

    await screen.findByText('Warm scarf');
    const search = screen.getByLabelText('Search gifts');

    await user.type(search, 'BEA');
    await waitFor(() => expect(giftRowIds()).toEqual([book.id]));
    expect(screen.getByText('1 of 3 gifts shown')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'books');
    await waitFor(() => expect(giftRowIds()).toEqual([book.id]));

    await user.clear(search);
    await user.type(search, 'bookshop');
    await waitFor(() => expect(giftRowIds()).toEqual([book.id]));

    await user.clear(search);
    await user.type(search, 'scarf');
    await waitFor(() => expect(giftRowIds()).toEqual([scarf.id]));
  });

  it('combines search and filters with AND semantics', async () => {
    const user = userEvent.setup();
    const { storage, alex, book } = await seedGifts();
    await renderApp(['/gifts'], { storage });

    await screen.findByText('Warm scarf');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Recipient' }), alex.id);
    await user.type(screen.getByLabelText('Search gifts'), 'book');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No gifts match these filters' }),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search gifts'));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Recipient' }), '');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Bought' }), 'yes');
    await waitFor(() => expect(giftRowIds()).toEqual([book.id]));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Bought' }), 'no');
    expect(giftRowIds()).toHaveLength(2);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Wrapped' }), 'yes');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No gifts match these filters' }),
    ).toBeInTheDocument();
  });

  it('filters by category and clears every control with Clear all', async () => {
    const user = userEvent.setup();
    const { storage, book, scarf, lamp } = await seedGifts();
    await renderApp(['/gifts'], { storage });

    await screen.findByText('Warm scarf');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Books');
    await waitFor(() => expect(giftRowIds()).toEqual([book.id]));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'name-desc');
    await user.type(screen.getByLabelText('Search gifts'), 'book');
    await waitFor(() => expect(giftRowIds()).toEqual([book.id]));

    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    await waitFor(() => expect(giftRowIds()).toEqual([lamp.id, scarf.id, book.id]));
    expect(screen.getByLabelText('Search gifts')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('recipient-asc');
    expect(screen.getByText('All 3 gifts shown')).toBeInTheDocument();
  });

  it('offers a clear-filters action in the no-results state', async () => {
    const user = userEvent.setup();
    const { storage, scarf, book, lamp } = await seedGifts();
    await renderApp(['/gifts'], { storage });

    await screen.findByText('Warm scarf');
    await user.type(screen.getByLabelText('Search gifts'), 'not-a-gift');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No gifts match these filters' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: 'No gifts yet' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => expect(giftRowIds()).toEqual([lamp.id, scarf.id, book.id]));
  });

  it('sorts by name, planned budget, actual cost, and status', async () => {
    const user = userEvent.setup();
    const { storage, scarf, book, lamp } = await seedGifts();
    await renderApp(['/gifts'], { storage });

    await screen.findByText('Warm scarf');
    expect(giftRowIds()).toEqual([lamp.id, scarf.id, book.id]);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'name-desc');
    await waitFor(() => expect(giftRowIds()).toEqual([scarf.id, lamp.id, book.id]));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'planned-desc');
    await waitFor(() => expect(giftRowIds()).toEqual([lamp.id, scarf.id, book.id]));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'actual-asc');
    await waitFor(() => expect(giftRowIds()).toEqual([book.id, lamp.id, scarf.id]));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'status-desc');
    await waitFor(() => expect(giftRowIds()).toEqual([book.id, lamp.id, scarf.id]));
  });

  it('updates filtered results when gift data changes', async () => {
    const user = userEvent.setup();
    const { storage, scarf, lamp } = await seedGifts();
    await renderApp(['/gifts'], { storage });

    await screen.findByText('Warm scarf');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Bought' }), 'no');
    await waitFor(() => expect(giftRowIds()).toEqual([lamp.id, scarf.id]));

    await user.click(screen.getByRole('checkbox', { name: 'Mark Warm scarf as bought' }));

    await waitFor(() => expect(giftRowIds()).toEqual([lamp.id]));
    expect(screen.getByText('1 of 3 gifts shown')).toBeInTheDocument();
  });
});
