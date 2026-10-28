import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RecipientCreateInput } from '../domain/schemas';
import { createTestStorage, type TestStorage } from '../test/storage';
import { renderApp } from '../test/render';

interface SeasonOptions {
  name?: string;
  holidayDate?: string;
  budgetMinor?: number | null;
  status?: 'active' | 'archived';
}

async function addSeason(storage: TestStorage, options: SeasonOptions = {}) {
  return storage.repositories.seasons.create({
    name: 'Christmas 2026',
    holidayDate: '2026-12-25',
    budgetMinor: 50000,
    ...options,
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

function cardFor(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { level: 2, name });
  const card = heading.closest('section');

  if (!(card instanceof HTMLElement)) {
    throw new Error(`Card for ${name} was not found.`);
  }

  return card;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Recipients page', () => {
  it('shows the no-season state and never creates a season on load', async () => {
    const storage = await createTestStorage();
    await renderApp(['/recipients'], { storage });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Create a season first' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create your first season' })).toBeInTheDocument();
    await expect(storage.repositories.seasons.list()).resolves.toHaveLength(0);
  });

  it('shows a loading state while storage is being read', async () => {
    const storage = await createTestStorage();
    vi.spyOn(storage.repositories.settings, 'get').mockImplementation(
      () => new Promise<never>(() => undefined),
    );

    await renderApp(['/recipients'], { storage });

    expect(screen.getByText('Loading recipients…')).toBeInTheDocument();
  });

  it('shows an error state instead of pretending the list is empty', async () => {
    const storage = await createTestStorage();
    vi.spyOn(storage.repositories.settings, 'get').mockRejectedValue(
      new Error('Storage is unavailable in this test.'),
    );

    await renderApp(['/recipients'], { storage });

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Your recipients could not be loaded.',
      }),
    ).toBeInTheDocument();
  });

  it('shows an empty state when the active season has no recipients', async () => {
    const storage = await createTestStorage();
    await addSeason(storage);
    await renderApp(['/recipients'], { storage });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'No recipients yet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your first recipient' })).toBeInTheDocument();
  });

  it('creates a recipient with every optional field and persists it', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    await renderApp(['/recipients'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Add your first recipient' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a recipient' });

    await user.type(within(dialog).getByLabelText(/^Name/), 'Alex');
    await user.type(within(dialog).getByLabelText(/Relationship/), 'Sister');
    await user.type(within(dialog).getByLabelText(/Budget cap/), '150.00');
    await user.type(within(dialog).getByLabelText(/Notes/), 'Prefers practical gifts.');
    await user.click(within(dialog).getByRole('button', { name: 'Add recipient' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Add a recipient' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Alex was added.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Alex' })).toBeInTheDocument();

    const stored = await storage.repositories.recipients.listBySeason(season.id);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      name: 'Alex',
      relationship: 'Sister',
      budgetCapMinor: 15000,
      notes: 'Prefers practical gifts.',
    });
  });

  it('edits a recipient and keeps the change after a remount', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    await addRecipient(storage, season.id, 'Alex');
    const firstRender = await renderApp(['/recipients'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Edit Alex' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit recipient' });
    const nameInput = within(dialog).getByLabelText(/^Name/);
    await user.clear(nameInput);
    await user.type(nameInput, 'Alexandra');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Edit recipient' })).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('heading', { level: 2, name: 'Alexandra' })).toBeInTheDocument();

    firstRender.unmount();
    await renderApp(['/recipients'], { storage });

    expect(await screen.findByRole('heading', { level: 2, name: 'Alexandra' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Alex' })).not.toBeInTheDocument();
  });

  it('shows accessible inline errors for a required and overlong name', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await addSeason(storage);
    await renderApp(['/recipients'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Add your first recipient' }));
    let dialog = await screen.findByRole('dialog', { name: 'Add a recipient' });

    await user.click(within(dialog).getByRole('button', { name: 'Add recipient' }));
    expect(await within(dialog).findByText('Recipient name is required.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Name/)).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(within(dialog).getByLabelText(/^Name/), {
      target: { value: 'N'.repeat(81) },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Add recipient' }));

    expect(
      await within(dialog).findByText('Recipient name must be 80 characters or fewer.'),
    ).toBeInTheDocument();
    dialog = await screen.findByRole('dialog', { name: 'Add a recipient' });
    expect(dialog).toBeInTheDocument();
    await expect(storage.db.recipients.count()).resolves.toBe(0);
  });

  it('accepts duplicate names as separate records', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    await addRecipient(storage, season.id, 'Sam');
    await addRecipient(storage, season.id, 'Sam', { relationship: 'Colleague' });
    await renderApp(['/recipients'], { storage });

    const headings = await screen.findAllByRole('heading', { level: 2, name: 'Sam' });
    expect(headings).toHaveLength(2);
    expect(new Set(headings.map((heading) => heading.closest('section'))).size).toBe(2);
    await expect(storage.repositories.recipients.listBySeason(season.id)).resolves.toHaveLength(2);
  });

  it('distinguishes a zero cap from no cap', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    await addRecipient(storage, season.id, 'Zero Cap', { budgetCapMinor: 0 });
    await addRecipient(storage, season.id, 'No Cap', { budgetCapMinor: null });
    await renderApp(['/recipients'], { storage });

    const zeroCard = within(await waitFor(() => cardFor('Zero Cap')));
    expect(zeroCard.getAllByText('Zero cap')).toHaveLength(2);
    expect(zeroCard.getByText('A zero cap intentionally allows no spending.')).toBeInTheDocument();
    expect(zeroCard.getAllByText('$0.00', { selector: 'dd' })).toHaveLength(3);

    const noCapCard = within(cardFor('No Cap'));
    expect(noCapCard.getAllByText('No cap').length).toBeGreaterThan(0);
    expect(noCapCard.getByText('No cap set')).toBeInTheDocument();
    expect(
      noCapCard.getByText('Add a cap to see utilization. Planned and spent still count.'),
    ).toBeInTheDocument();
  });

  it('rejects malformed and negative cap input with a clear message', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await addSeason(storage);
    await renderApp(['/recipients'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Add your first recipient' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a recipient' });
    await user.type(within(dialog).getByLabelText(/^Name/), 'Jordan');
    await user.type(within(dialog).getByLabelText(/Budget cap/), '-20');
    await user.click(within(dialog).getByRole('button', { name: 'Add recipient' }));

    expect(
      await within(dialog).findByText(
        'Enter an amount using digits, a decimal point, or a decimal comma.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Budget cap/)).toHaveAttribute('aria-invalid', 'true');
    await expect(storage.db.recipients.count()).resolves.toBe(0);
  });

  it('rejects malformed cap input with a clear message', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await addSeason(storage);
    await renderApp(['/recipients'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Add your first recipient' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a recipient' });
    await user.type(within(dialog).getByLabelText(/^Name/), 'Jordan');
    await user.type(within(dialog).getByLabelText(/Budget cap/), '12.34.5');
    await user.click(within(dialog).getByRole('button', { name: 'Add recipient' }));

    expect(
      await within(dialog).findByText('Use grouping separators in groups of three digits.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Budget cap/)).toHaveAttribute('aria-invalid', 'true');
    await expect(storage.db.recipients.count()).resolves.toBe(0);
  });

  it('shows planned, spent, remaining cap, and progress from gift records', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const recipient = await addRecipient(storage, season.id, 'Alex', {
      budgetCapMinor: 10000,
    });
    await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Scarf',
      plannedBudgetMinor: 2500,
      actualCostMinor: 2000,
      bought: true,
    });
    await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Book',
      plannedBudgetMinor: 3500,
      bought: false,
    });
    await renderApp(['/recipients'], { storage });

    const card = within(await waitFor(() => cardFor('Alex')));
    expect(card.getByText('$60.00')).toBeInTheDocument();
    expect(card.getByText('$20.00')).toBeInTheDocument();
    expect(card.getByText('$80.00')).toBeInTheDocument();
    expect(card.getByText('20% of cap used')).toBeInTheDocument();
    expect(card.getByRole('progressbar', { name: 'Alex budget cap used' })).toHaveAttribute(
      'aria-valuenow',
      '20',
    );
    expect(card.getByText('2 gifts')).toBeInTheDocument();
  });

  it('updates recipient summaries live when a gift changes without a reload', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const recipient = await addRecipient(storage, season.id, 'Alex', {
      budgetCapMinor: 10000,
    });
    await renderApp(['/recipients'], { storage });

    const card = within(await waitFor(() => cardFor('Alex')));
    expect(card.getByText('No gifts yet')).toBeInTheDocument();

    const gift = await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Scarf',
      plannedBudgetMinor: 2500,
      actualCostMinor: 1999,
      bought: false,
    });

    await waitFor(() => {
      expect(card.getByText('$25.00')).toBeInTheDocument();
      expect(card.getByText('1 gift')).toBeInTheDocument();
    });
    expect(card.queryByText('$19.99')).not.toBeInTheDocument();

    await storage.repositories.gifts.setPurchaseState(gift.id, { bought: true });

    await waitFor(() => {
      expect(card.getByText('$19.99')).toBeInTheDocument();
      expect(card.getByText('20% of cap used')).toBeInTheDocument();
    });

    await storage.repositories.gifts.delete(gift.id);

    await waitFor(() => {
      expect(card.getByText('No gifts yet')).toBeInTheDocument();
    });
  });

  it('lists only recipients for the active season', async () => {
    const storage = await createTestStorage();
    const previous = await addSeason(storage, {
      name: 'Christmas 2025',
      holidayDate: '2025-12-25',
    });
    await addRecipient(storage, previous.id, 'Old Person');
    await storage.repositories.seasons.archive(previous.id);
    const active = await addSeason(storage, {
      name: 'Christmas 2026',
      holidayDate: '2026-12-25',
    });
    await addRecipient(storage, active.id, 'Current Person');
    await renderApp(['/recipients'], { storage });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Current Person' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Old Person' })).not.toBeInTheDocument();
  });

  it('renders an archived season as read-only', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    await addRecipient(storage, season.id, 'Archived Person');
    const archived = await storage.repositories.seasons.archive(season.id);
    await storage.db.settings.update('app', { activeSeasonId: archived.id });

    await renderApp(['/recipients'], { storage });

    expect(await screen.findAllByText('Archived · read only')).not.toHaveLength(0);
    expect(
      screen.getByText(/Recipients are read-only\. Restore the season to make changes/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add recipient' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Archived Person' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete Archived Person' }),
    ).not.toBeInTheDocument();
  });

  it('deletes a recipient with no gifts after confirmation', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    await addRecipient(storage, season.id, 'Alex');
    await renderApp(['/recipients'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Delete Alex' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Alex?' });
    expect(await within(dialog).findByText('No gifts linked')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete recipient' }));

    expect(await screen.findByText('Alex was deleted.')).toBeInTheDocument();
    await waitFor(() => {
      expect(document.getElementById('main-content')).toHaveFocus();
    });
    await expect(storage.repositories.recipients.listBySeason(season.id)).resolves.toHaveLength(0);
  });

  it('makes no changes when deleting a recipient with gifts is cancelled', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await addRecipient(storage, season.id, 'Bailey');
    await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: alex.id,
      name: 'Scarf',
      plannedBudgetMinor: 2500,
    });
    await renderApp(['/recipients'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Delete Alex' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Alex?' });
    expect(await within(dialog).findByText('1 gift linked')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete Alex?' })).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete Alex' })).toHaveFocus();
    });
    await expect(storage.repositories.recipients.listBySeason(season.id)).resolves.toHaveLength(2);
    const gifts = await storage.repositories.gifts.listByRecipient(alex.id);
    expect(gifts).toHaveLength(1);
  });

  it('reassigns all gifts and deletes the source recipient', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    const bailey = await addRecipient(storage, season.id, 'Bailey');
    await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: alex.id,
      name: 'Scarf',
      plannedBudgetMinor: 2500,
    });
    await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: alex.id,
      name: 'Book',
      plannedBudgetMinor: 3500,
    });
    await renderApp(['/recipients'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Delete Alex' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Alex?' });
    expect(await within(dialog).findByText('2 gifts linked')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Move gifts to')).toHaveValue(bailey.id);
    await user.click(within(dialog).getByRole('button', { name: 'Move gifts and delete' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete Alex?' })).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText('Alex was deleted. 2 gifts were moved to Bailey.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Alex' })).not.toBeInTheDocument();
    });
    await expect(storage.repositories.recipients.get(alex.id)).rejects.toThrow();
    await expect(storage.repositories.gifts.listByRecipient(bailey.id)).resolves.toHaveLength(2);
  });

  it('requires the name before cascading gifts and leaves ideas unassigned', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const alex = await addRecipient(storage, season.id, 'Alex');
    await addRecipient(storage, season.id, 'Bailey');
    await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: alex.id,
      name: 'Scarf',
      plannedBudgetMinor: 2500,
    });
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id,
      recipientId: alex.id,
      name: 'Book of walks',
    });
    await renderApp(['/recipients'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Delete Alex' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Alex?' });
    await within(dialog).findByText('1 gift linked');
    await user.click(within(dialog).getByRole('radio', { name: /Delete the gifts too/ }));

    const confirmButton = within(dialog).getByRole('button', {
      name: 'Delete recipient and gifts',
    });
    expect(confirmButton).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/Type .*Alex.* to confirm/), 'Alex');
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Delete Alex?' })).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText(
        'Alex and 1 gift were deleted. 1 idea is still in the Idea Bank without a recipient.',
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Alex' })).not.toBeInTheDocument();
    });
    await expect(storage.repositories.recipients.get(alex.id)).rejects.toThrow();
    await expect(storage.repositories.gifts.listByRecipient(alex.id)).resolves.toHaveLength(0);
    const reopenedIdea = await storage.repositories.ideas.get(idea.id);
    expect(reopenedIdea.recipientId).toBeNull();
    expect(reopenedIdea.status).toBe('active');
  });
});
