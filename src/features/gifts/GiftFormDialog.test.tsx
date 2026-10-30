import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  GiftCreateInput,
  RecipientCreateInput,
  SeasonCreateInput,
} from '../../domain/schemas';
import { createTestStorage, type TestStorage } from '../../test/storage';
import { renderApp } from '../../test/render';

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  name = 'Alex',
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

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Gifts page', () => {
  it('shows no-season state when there is no active season', async () => {
    const storage = await createTestStorage();
    await renderApp(['/gifts'], { storage });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Create a season first' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create your first season' })).toBeInTheDocument();
  });

  it('shows a loading state while data is being fetched', async () => {
    const storage = await createTestStorage();
    vi.spyOn(storage.repositories.settings, 'get').mockImplementation(
      () => new Promise<never>(() => undefined),
    );
    await renderApp(['/gifts'], { storage });

    expect(screen.getByText('Loading gifts…')).toBeInTheDocument();
  });

  it('shows an error state when storage fails', async () => {
    const storage = await createTestStorage();
    vi.spyOn(storage.repositories.settings, 'get').mockRejectedValue(
      new Error('Storage unavailable.'),
    );
    await renderApp(['/gifts'], { storage });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your gifts could not be loaded.' }),
    ).toBeInTheDocument();
  });

  it('shows the empty state when the active season has no gifts', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    await addRecipient(storage, season.id, 'Alex');
    await renderApp(['/gifts'], { storage });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No gifts yet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your first gift' })).toBeInTheDocument();
  });

  it('highlights and focuses the gift targeted by a converted-idea link', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    const gift = await addGift(storage, season.id, alex.id, { name: 'Warm scarf' });
    await renderApp([`/gifts#gift-${gift.id}`], { storage });

    const row = (await screen.findByText('Warm scarf')).closest('tr');
    if (!row) throw new Error('Gift row was not rendered.');

    await waitFor(() => {
      expect(row).toHaveAttribute('data-highlighted', 'true');
      expect(row).toHaveFocus();
    });
  });

  it('asks for a recipient before a gift can be added', async () => {
    const storage = await createTestStorage();
    await addSeason(storage);
    await renderApp(['/gifts'], { storage });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Add a recipient first' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add a recipient' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add gift' })).not.toBeInTheDocument();
  });

  it('creates a gift with required fields only and shows it in the table', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Add your first gift' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a gift' });

    await user.type(within(dialog).getByLabelText(/Gift name/), 'Warm scarf');
    // Recipient select should be pre-populated with Alex
    expect(within(dialog).getByRole('combobox', { name: /Recipient/ })).toHaveValue(alex.id);
    await user.click(within(dialog).getByRole('button', { name: 'Add gift' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Add a gift' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Warm scarf was added.')).toBeInTheDocument();
    expect(screen.getByText('Warm scarf')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Gift list' })).getByText('Alex'),
    ).toBeInTheDocument();

    const stored = await storage.repositories.gifts.listBySeason(season.id);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: 'Warm scarf', recipientId: alex.id });
  });

  it('creates a gift with all optional fields', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Add your first gift' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a gift' });

    await user.type(within(dialog).getByLabelText(/Gift name/), 'Cashmere scarf');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /Recipient/ }), alex.id);
    await user.type(within(dialog).getByLabelText(/Category/), 'Clothing');
    await user.type(within(dialog).getByLabelText(/Store/), 'John Lewis');
    await user.type(
      within(dialog).getByLabelText(/Purchase link/),
      'https://example.com/cashmere-scarf',
    );
    await user.type(within(dialog).getByLabelText(/Planned budget/), '75.00');
    await user.type(within(dialog).getByLabelText(/Actual cost/), '69.99');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Bought' }));
    fireEvent.change(within(dialog).getByLabelText(/Bought date/), {
      target: { value: '2026-12-01' },
    });
    await user.click(within(dialog).getByRole('checkbox', { name: 'Wrapped' }));
    fireEvent.change(within(dialog).getByLabelText(/Wrapped date/), {
      target: { value: '2026-12-10' },
    });
    await user.click(within(dialog).getByRole('checkbox', { name: 'Sent' }));
    fireEvent.change(within(dialog).getByLabelText(/Sent date/), {
      target: { value: '2026-12-14' },
    });
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: /Delivery method/ }),
      'shipped',
    );
    await user.type(within(dialog).getByLabelText(/Delivery address/), '12 Market Street');
    await user.type(within(dialog).getByLabelText(/Notes/), 'Gift wrap in navy paper.');
    await user.click(within(dialog).getByRole('button', { name: 'Add gift' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const stored = await storage.repositories.gifts.listBySeason(season.id);
    expect(stored[0]).toMatchObject({
      name: 'Cashmere scarf',
      recipientId: alex.id,
      category: 'Clothing',
      store: 'John Lewis',
      purchaseUrl: 'https://example.com/cashmere-scarf',
      plannedBudgetMinor: 7500,
      actualCostMinor: 6999,
      bought: true,
      boughtOn: '2026-12-01',
      wrapped: true,
      wrappedOn: '2026-12-10',
      sent: true,
      sentOn: '2026-12-14',
      deliveryMethod: 'shipped',
      address: '12 Market Street',
      notes: 'Gift wrap in navy paper.',
    });
  });

  it('rejects a purchase link that is not http or https', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    await addRecipient(storage, season.id, 'Alex');
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Add your first gift' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a gift' });
    await user.type(within(dialog).getByLabelText(/Gift name/), 'Scarf');
    await user.type(within(dialog).getByLabelText(/Purchase link/), 'javascript:alert(1)');
    await user.click(within(dialog).getByRole('button', { name: 'Add gift' }));

    expect(
      await within(dialog).findByText('Enter a complete http:// or https:// link.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Purchase link/)).toHaveAttribute('aria-invalid', 'true');
    await expect(storage.db.gifts.count()).resolves.toBe(0);
  });

  it('rejects empty gift name with an accessible error', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    await addRecipient(storage, season.id, 'Alex');
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Add your first gift' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a gift' });
    await user.click(within(dialog).getByRole('button', { name: 'Add gift' }));

    expect(await within(dialog).findByText('Gift name is required.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Gift name/)).toHaveAttribute('aria-invalid', 'true');
    await expect(storage.db.gifts.count()).resolves.toBe(0);
  });

  it('rejects invalid money input with a clear message', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    await addRecipient(storage, season.id, 'Alex');
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Add your first gift' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a gift' });

    await user.type(within(dialog).getByLabelText(/Gift name/), 'Scarf');
    await user.type(within(dialog).getByLabelText(/Planned budget/), 'abc');
    await user.click(within(dialog).getByRole('button', { name: 'Add gift' }));

    expect(
      await within(dialog).findByText(
        'Enter an amount using digits, a decimal point, or a decimal comma.',
      ),
    ).toBeInTheDocument();
    await expect(storage.db.gifts.count()).resolves.toBe(0);
  });

  it('disables Wrapped and Sent checkboxes when Bought is unchecked', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    await addRecipient(storage, season.id, 'Alex');
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Add your first gift' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a gift' });

    expect(within(dialog).getByRole('checkbox', { name: 'Wrapped' })).toBeDisabled();
    expect(within(dialog).getByRole('checkbox', { name: 'Sent' })).toBeDisabled();

    await user.click(within(dialog).getByRole('checkbox', { name: 'Bought' }));
    expect(within(dialog).getByRole('checkbox', { name: 'Wrapped' })).toBeEnabled();
    expect(within(dialog).getByRole('checkbox', { name: 'Sent' })).toBeEnabled();

    await user.click(within(dialog).getByRole('checkbox', { name: 'Bought' }));
    expect(within(dialog).getByRole('checkbox', { name: 'Wrapped' })).toBeDisabled();
    expect(within(dialog).getByRole('checkbox', { name: 'Sent' })).toBeDisabled();
  });

  it('edits an existing gift and persists changes', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await addGift(storage, season.id, alex.id, { name: 'Old scarf' });
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Edit Old scarf' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit gift' });
    const nameInput = within(dialog).getByLabelText(/Gift name/);
    await user.clear(nameInput);
    await user.type(nameInput, 'New scarf');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('New scarf was updated.')).toBeInTheDocument();
    expect(screen.getByText('New scarf')).toBeInTheDocument();
    expect(screen.queryByText('Old scarf')).not.toBeInTheDocument();
  });

  it('deletes a gift after confirmation and updates the table', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await addGift(storage, season.id, alex.id, { name: 'Doomed gift' });
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Delete Doomed gift' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete "Doomed gift"?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete gift' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText("Doomed gift was deleted from Alex's gifts."),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No gifts yet' }),
    ).toBeInTheDocument();
    await expect(storage.db.gifts.count()).resolves.toBe(0);
  });

  it('does not delete when cancel is clicked', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await addGift(storage, season.id, alex.id, { name: 'Surviving gift' });
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Delete Surviving gift' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete "Surviving gift"?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Surviving gift')).toBeInTheDocument();
    await expect(storage.db.gifts.count()).resolves.toBe(1);
  });

  it('persists a gift after page remount', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await addGift(storage, season.id, alex.id, { name: 'Persistent gift' });

    const first = await renderApp(['/gifts'], { storage });
    expect(await screen.findByText('Persistent gift')).toBeInTheDocument();

    first.unmount();
    await renderApp(['/gifts'], { storage });
    expect(await screen.findByText('Persistent gift')).toBeInTheDocument();
  });

  it('renders the archived state as read-only', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await addGift(storage, season.id, alex.id, { name: 'Archived gift' });
    const archived = await storage.repositories.seasons.archive(season.id);
    await storage.db.settings.update('app', { activeSeasonId: archived.id });

    await renderApp(['/gifts'], { storage });

    expect(await screen.findByText('Archived gift')).toBeInTheDocument();
    expect(screen.getAllByText('Archived · read only')).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Add gift' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Archived gift' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Archived gift' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Gift list' });
    const headers = within(table).getAllByRole('columnheader');
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getAllByRole('cell')).toHaveLength(headers.length);
  });

  it('toggles bought status with quick-toggle checkbox and updates status badge', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await addGift(storage, season.id, alex.id, { name: 'Toggle gift', bought: false });
    await renderApp(['/gifts'], { storage });

    expect(await screen.findByText('Not started')).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox', { name: 'Mark Toggle gift as bought' });
    await user.click(checkbox);

    await waitFor(() => {
      expect(screen.getAllByText('Bought')).toHaveLength(2);
      expect(checkbox).not.toBeDisabled();
    });
    const stored = await storage.repositories.gifts.listBySeason(season.id);
    expect(stored[0]?.bought).toBe(true);
  });

  it('marks a gift sent without requiring wrapping', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await addGift(storage, season.id, alex.id, {
      name: 'Retailer parcel',
      bought: true,
      boughtOn: '2026-12-02',
    });
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('checkbox', { name: 'Mark Retailer parcel as sent' }));

    await waitFor(async () => {
      const stored = await storage.repositories.gifts.listBySeason(season.id);
      expect(stored[0]).toMatchObject({ bought: true, wrapped: false, sent: true });
      expect(stored[0]?.sentOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('requires confirmation before a quick un-buy clears wrapped and sent', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await addGift(storage, season.id, alex.id, {
      name: 'Confirmed gift',
      bought: true,
      boughtOn: '2026-12-02',
      wrapped: true,
      wrappedOn: '2026-12-10',
      sent: true,
      sentOn: '2026-12-12',
    });
    await renderApp(['/gifts'], { storage });

    const bought = await screen.findByRole('checkbox', {
      name: 'Mark Confirmed gift as bought',
    });
    await user.click(bought);

    const dialog = await screen.findByRole('dialog', { name: 'Un-buy "Confirmed gift"?' });
    expect(await storage.repositories.gifts.listBySeason(season.id)).toEqual([
      expect.objectContaining({ bought: true, wrapped: true, sent: true }),
    ]);

    await user.click(within(dialog).getByRole('button', { name: 'Keep as bought' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(bought).toBeChecked();

    await user.click(bought);
    const confirm = await screen.findByRole('dialog', { name: 'Un-buy "Confirmed gift"?' });
    await user.click(within(confirm).getByRole('button', { name: 'Un-buy gift' }));

    await waitFor(async () => {
      const stored = await storage.repositories.gifts.listBySeason(season.id);
      expect(stored[0]).toMatchObject({
        bought: false,
        boughtOn: null,
        wrapped: false,
        wrappedOn: null,
        sent: false,
        sentOn: null,
      });
    });
    expect(await screen.findByText('Not started')).toBeInTheDocument();
  });

  it('requires confirmation before un-buying in the form and clears dependent dates', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await addGift(storage, season.id, alex.id, {
      name: 'Form gift',
      bought: true,
      boughtOn: '2026-12-02',
      wrapped: true,
      wrappedOn: '2026-12-10',
      sent: true,
      sentOn: '2026-12-12',
    });
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Edit Form gift' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit gift' });
    const bought = within(dialog).getByRole('checkbox', { name: 'Bought' });
    await user.click(bought);

    expect(bought).toBeChecked();
    expect(within(dialog).getByText('Un-buy this gift?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Keep as bought' }));
    expect(bought).toBeChecked();
    expect(within(dialog).queryByText('Un-buy this gift?')).not.toBeInTheDocument();

    await user.click(bought);
    await user.click(within(dialog).getByRole('button', { name: 'Un-buy and clear' }));
    expect(bought).not.toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'Wrapped' })).not.toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'Sent' })).not.toBeChecked();
    expect(within(dialog).getByLabelText(/Bought date/)).toHaveValue('');

    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const stored = await storage.repositories.gifts.listBySeason(season.id);
    expect(stored[0]).toMatchObject({
      bought: false,
      boughtOn: null,
      wrapped: false,
      wrappedOn: null,
      sent: false,
      sentOn: null,
    });
  });

  it('flags a bought gift that has no actual cost', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await addGift(storage, season.id, alex.id, {
      name: 'Mystery gift',
      bought: true,
    });
    await renderApp(['/gifts'], { storage });

    expect(await screen.findByText('Cost missing')).toBeInTheDocument();
    expect(screen.getAllByText('Bought').length).toBeGreaterThan(0);
  });

  it('only lists gifts for the active season', async () => {
    const storage = await createTestStorage();
    const prev = await addSeason(storage, {
      name: 'Christmas 2025',
      holidayDate: '2025-12-25',
    });
    const prevRecipient = await addRecipient(storage, prev.id, 'Old Recipient');
    await addGift(storage, prev.id, prevRecipient.id, { name: 'Old gift' });
    await storage.repositories.seasons.archive(prev.id);

    const active = await addSeason(storage, {
      name: 'Christmas 2026',
      holidayDate: '2026-12-25',
    });
    const activeRecipient = await addRecipient(storage, active.id, 'New Recipient');
    await addGift(storage, active.id, activeRecipient.id, { name: 'Current gift' });

    await renderApp(['/gifts'], { storage });

    expect(await screen.findByText('Current gift')).toBeInTheDocument();
    expect(screen.queryByText('Old gift')).not.toBeInTheDocument();
  });
});
