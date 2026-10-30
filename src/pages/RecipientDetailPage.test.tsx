import { screen, waitFor, within } from '@testing-library/react';
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

async function seedRecipient() {
  const storage = await createTestStorage();
  const season = await addSeason(storage);
  const alex = await addRecipient(storage, season.id, 'Alex', {
    relationship: 'Family',
    budgetCapMinor: 10000,
    notes: 'Prefers practical gifts.',
  });
  const bea = await addRecipient(storage, season.id, 'Béa', {
    relationship: 'Friend',
    budgetCapMinor: 5000,
  });

  const scarf = await addGift(storage, season.id, alex.id, {
    name: 'Warm scarf',
    category: 'Clothing',
    plannedBudgetMinor: 2500,
    actualCostMinor: 2400,
    bought: true,
    wrapped: true,
  });
  const book = await addGift(storage, season.id, alex.id, {
    name: 'Book of walks',
    category: 'Books',
    plannedBudgetMinor: 4000,
    bought: false,
  });
  const beaGift = await addGift(storage, season.id, bea.id, {
    name: 'Desk lamp',
    plannedBudgetMinor: 9000,
    bought: false,
  });

  return { storage, season, alex, bea, scarf, book, beaGift };
}

describe('Recipient detail page', () => {
  it('shows recipient totals, progress, notes, and only that recipient’s gifts', async () => {
    const { storage, alex, scarf, book } = await seedRecipient();
    await renderApp([`/recipients/${alex.id}`], { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Alex' })).toBeInTheDocument();
    expect(screen.getByText('Family · Christmas 2026 · Dec 25, 2026')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$65.00')).toBeInTheDocument();
    expect(screen.getByText('$76.00')).toBeInTheDocument();
    expect(screen.getByText('24%')).toBeInTheDocument();
    expect(screen.getByText('$24.00 spent of $100.00. $76.00 remains.')).toBeInTheDocument();
    expect(screen.getByText('Prefers practical gifts.')).toBeInTheDocument();

    expect(screen.getByRole('progressbar', { name: 'Bought: 1 of 2' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Wrapped: 1 of 2' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Sent: 0 of 2' })).toBeInTheDocument();

    expect(screen.getByText('Warm scarf')).toBeInTheDocument();
    expect(screen.getByText('Book of walks')).toBeInTheDocument();
    expect(screen.queryByText('Desk lamp')).not.toBeInTheDocument();
    expect(screen.getByText(scarf.category ?? '')).toBeInTheDocument();
    expect(screen.getByText(book.category ?? '')).toBeInTheDocument();
  });

  it('provides recipient edit access from the detail page', async () => {
    const user = userEvent.setup();
    const { storage, alex } = await seedRecipient();
    await renderApp([`/recipients/${alex.id}`], { storage });

    await user.click(await screen.findByRole('button', { name: 'Edit recipient' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit recipient' });
    expect(within(dialog).getByLabelText(/Name/)).toHaveValue('Alex');
    expect(within(dialog).getByLabelText(/Budget cap/)).toHaveValue('100.00');

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('links from the recipients list to the detail page', async () => {
    const user = userEvent.setup();
    const { storage, alex } = await seedRecipient();
    await renderApp(['/recipients'], { storage });

    await user.click(await screen.findByRole('link', { name: 'View details for Alex' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Alex' })).toBeInTheDocument();
    expect(screen.getByText('Family · Christmas 2026 · Dec 25, 2026')).toBeInTheDocument();
    expect(alex.id).toBeTruthy();
  });

  it('shows a not-found state for an unknown recipient without crashing', async () => {
    const { storage } = await seedRecipient();
    await renderApp(['/recipients/not-a-recipient'], { storage });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recipient not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to recipients' })).toHaveAttribute(
      'href',
      '/recipients',
    );
  });

  it('shows the create-season state when there is no active season', async () => {
    const storage = await createTestStorage();
    await renderApp(['/recipients/anything'], { storage });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Create a season first' }),
    ).toBeInTheDocument();
  });

  it('handles a recipient with no cap and no gifts without inventing totals', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex', { budgetCapMinor: null });
    await renderApp([`/recipients/${alex.id}`], { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Alex' })).toBeInTheDocument();
    expect(screen.getAllByText('No cap')).toHaveLength(2);
    expect(
      screen.getByText(
        'No budget cap is set for this recipient. Spending is still tracked from bought gifts.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No gifts yet. Progress will appear here once this recipient has gifts.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'No gifts for this recipient yet' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('warns when spending is over a zero cap', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex', { budgetCapMinor: 0 });
    await addGift(storage, season.id, alex.id, {
      name: 'Warm scarf',
      plannedBudgetMinor: 500,
      actualCostMinor: 500,
      bought: true,
    });
    await renderApp([`/recipients/${alex.id}`], { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Alex' })).toBeInTheDocument();
    expect(screen.getByText('Over a zero cap')).toBeInTheDocument();
    expect(
      screen.getByText('A zero cap allows no spending. This recipient is over by $5.00.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Over cap by $5.00.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Cap used' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
  });

  it('edits and changes gift status from the detail page', async () => {
    const user = userEvent.setup();
    const { storage, alex, season, book } = await seedRecipient();
    await renderApp([`/recipients/${alex.id}`], { storage });

    await user.click(await screen.findByRole('button', { name: 'Edit Warm scarf' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit gift' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const boughtCheckbox = screen.getByRole('checkbox', { name: 'Mark Book of walks as bought' });
    await user.click(boughtCheckbox);

    await waitFor(async () => {
      const stored = await storage.repositories.gifts.listBySeason(season.id);
      expect(stored.find((gift) => gift.id === book.id)?.bought).toBe(true);
      expect(boughtCheckbox).not.toBeDisabled();
    });
  });

  it('renders an archived season as read-only', async () => {
    const { storage, season, alex } = await seedRecipient();
    const archived = await storage.repositories.seasons.archive(season.id);
    await storage.db.settings.update('app', { activeSeasonId: archived.id });

    await renderApp([`/recipients/${alex.id}`], { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Alex' })).toBeInTheDocument();
    expect(screen.getByText(/Recipient details and gifts are read-only/)).toBeInTheDocument();
    expect(screen.getByText('Archived — read only')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit recipient' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Warm scarf' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Mark .* as bought/ })).not.toBeInTheDocument();
    expect(screen.getByText('Warm scarf')).toBeInTheDocument();
  });
});
