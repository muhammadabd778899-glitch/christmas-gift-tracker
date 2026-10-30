import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createTestStorage, type TestStorage } from '../test/storage';
import { renderApp } from '../test/render';

async function cardFor(name: string) {
  const heading = await screen.findByRole('heading', { name });
  const card = heading.closest('section');

  if (!card) {
    throw new Error(`Could not find a card for ${name}.`);
  }

  return within(card as HTMLElement);
}

async function seedDashboard(storage: TestStorage) {
  const season = await storage.repositories.seasons.create({
    name: 'Christmas 2026',
    holidayDate: '2026-12-25',
    budgetMinor: 3000,
  });
  const alex = await storage.repositories.recipients.create({
    seasonId: season.id,
    name: 'Alex',
    relationship: 'Family',
    budgetCapMinor: 15000,
  });
  const blair = await storage.repositories.recipients.create({
    seasonId: season.id,
    name: 'Blair',
    relationship: 'Friend',
    budgetCapMinor: 1000,
  });
  const scarf = await storage.repositories.gifts.create({
    seasonId: season.id,
    recipientId: alex.id,
    name: 'Warm scarf',
    plannedBudgetMinor: 2500,
    actualCostMinor: 2400,
    bought: true,
  });
  const book = await storage.repositories.gifts.create({
    seasonId: season.id,
    recipientId: blair.id,
    name: 'Book of walks',
    plannedBudgetMinor: 6000,
    actualCostMinor: 1500,
    bought: true,
  });
  const gloves = await storage.repositories.gifts.create({
    seasonId: season.id,
    recipientId: alex.id,
    name: 'Gloves',
    plannedBudgetMinor: 2000,
    actualCostMinor: null,
    bought: true,
  });
  const candle = await storage.repositories.gifts.create({
    seasonId: season.id,
    recipientId: blair.id,
    name: 'Candle',
    plannedBudgetMinor: null,
    actualCostMinor: 1000,
    bought: false,
  });

  return { season, alex, blair, scarf, book, gloves, candle };
}

describe('dashboard', () => {
  it('shows a clear no-season state without creating a season', async () => {
    const { storage } = await renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Create a season to begin' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create your first season' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Budget at a glance' })).not.toBeInTheDocument();
    await expect(storage.repositories.seasons.list()).resolves.toHaveLength(0);
  });

  it('renders real totals, progress, warnings, and matching chart table data', async () => {
    const storage = await createTestStorage();
    await seedDashboard(storage);
    await renderApp(['/'], { storage });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Christmas 2026' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Christmas countdown/i)).toBeInTheDocument();
    expect(screen.getByText(/^until /)).toBeInTheDocument();

    const budgetCard = await cardFor('Season budget');
    expect(budgetCard.getByText('$30.00')).toBeInTheDocument();
    expect(budgetCard.getByRole('button', { name: 'Edit budget' })).toBeInTheDocument();

    const plannedCard = await cardFor('Planned spending');
    expect(plannedCard.getByText('$105.00')).toBeInTheDocument();
    expect(plannedCard.getByText('$75.00 above budget')).toBeInTheDocument();

    const actualCard = await cardFor('Actual spending');
    expect(actualCard.getByText('$39.00')).toBeInTheDocument();
    expect(actualCard.getByText('$9.00 over budget')).toBeInTheDocument();

    const remainingCard = await cardFor('Remaining budget');
    expect(remainingCard.getByText('-$9.00')).toBeInTheDocument();
    expect(remainingCard.getByText('Over budget')).toBeInTheDocument();
    expect(remainingCard.getByText('$9.00 more spent than budgeted')).toBeInTheDocument();

    const unallocatedCard = await cardFor('Unallocated budget');
    expect(unallocatedCard.getByText('-$75.00')).toBeInTheDocument();
    expect(unallocatedCard.getByText('Plan over budget')).toBeInTheDocument();
    expect(unallocatedCard.getByText('$75.00 more planned than budgeted')).toBeInTheDocument();

    const boughtProgress = screen.getByRole('progressbar', { name: 'Bought progress' });
    expect(boughtProgress).toHaveAttribute('aria-valuenow', '75');
    expect(boughtProgress).toHaveAttribute('aria-valuetext', '3 of 4 gifts, 75%');
    expect(screen.getByRole('progressbar', { name: 'Wrapped progress' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    expect(screen.getByRole('progressbar', { name: 'Sent progress' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );

    expect(
      screen.getByRole('heading', { name: 'Actual spending is over budget' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Bought gifts without a cost' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recipient caps exceeded' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your plan is over budget' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Gifts without a planned budget' }),
    ).toBeInTheDocument();
    const capAlert = screen.getByRole('heading', { name: 'Recipient caps exceeded' }).closest('li');
    expect(capAlert).not.toBeNull();
    expect(within(capAlert as HTMLElement).getByText('Blair')).toBeInTheDocument();
    expect(within(capAlert as HTMLElement).getByText(/\$5\.00 over cap/)).toBeInTheDocument();

    const table = await screen.findByRole('table', {
      name: 'Budget versus actual spending by recipient',
    });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByText('Blair')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('$60.00')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('$15.00')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Alex')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('$45.00')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('$24.00')).toBeInTheDocument();

    expect(
      await screen.findByRole('img', {
        name: /Planned versus actual spending by recipient/,
      }),
    ).toBeInTheDocument();

    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('explains unallocated budget with a keyboard-accessible tooltip', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await seedDashboard(storage);
    await renderApp(['/'], { storage });

    const tipButton = await screen.findByRole('button', { name: 'About unallocated budget' });
    expect(tipButton).toHaveAttribute('aria-expanded', 'false');

    tipButton.focus();
    await user.keyboard('{Enter}');

    expect(tipButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('note')).toHaveTextContent(
      'Season budget minus planned spending. It shows whether the plan fits',
    );

    await user.keyboard('{Escape}');

    expect(tipButton).toHaveAttribute('aria-expanded', 'false');
    expect(tipButton).toHaveFocus();
  });

  it('shows not-set budget values and can set a budget from the first-step panel', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await storage.repositories.seasons.create({
      name: 'Budgetless Christmas',
      holidayDate: '2026-12-25',
      budgetMinor: null,
    });
    await renderApp(['/'], { storage });

    const budgetCard = await cardFor('Season budget');
    expect(budgetCard.getByText('Not set')).toBeInTheDocument();
    expect(budgetCard.getByRole('button', { name: 'Set budget' })).toBeInTheDocument();
    expect((await cardFor('Remaining budget')).getByText('Not set')).toBeInTheDocument();
    expect((await cardFor('Unallocated budget')).getByText('Not set')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Set a season budget' }));

    const dialog = await screen.findByRole('dialog', { name: 'Set season budget' });
    const input = within(dialog).getByLabelText('Overall season budget (optional)');
    expect(input).toHaveValue('');
    await user.type(input, '250.00');
    await user.click(within(dialog).getByRole('button', { name: 'Save budget' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Set season budget' })).not.toBeInTheDocument();
    });

    await waitFor(async () => {
      expect((await cardFor('Season budget')).getByText('$250.00')).toBeInTheDocument();
    });
    expect((await cardFor('Remaining budget')).getByText('$250.00')).toBeInTheDocument();
    expect((await cardFor('Unallocated budget')).getByText('$250.00')).toBeInTheDocument();
  });

  it('updates remaining and unallocated after a budget edit without a reload', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await seedDashboard(storage);
    await renderApp(['/'], { storage });

    const budgetCard = await cardFor('Season budget');
    await user.click(budgetCard.getByRole('button', { name: 'Edit budget' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit season budget' });
    const input = within(dialog).getByLabelText('Overall season budget (optional)');
    expect(input).toHaveValue('30.00');

    await user.clear(input);
    await user.type(input, '500.00');
    await user.click(within(dialog).getByRole('button', { name: 'Save budget' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Edit season budget' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Season budget updated.')).toBeInTheDocument();

    await waitFor(async () => {
      const refreshedBudget = await cardFor('Season budget');
      expect(refreshedBudget.getByText('$500.00')).toBeInTheDocument();
    });

    const remaining = await cardFor('Remaining budget');
    expect(remaining.getByText('$461.00')).toBeInTheDocument();
    const unallocated = await cardFor('Unallocated budget');
    expect(unallocated.getByText('$395.00')).toBeInTheDocument();
    expect(screen.queryByText('Actual spending is over budget')).not.toBeInTheDocument();
  });

  it('updates spending and progress when a gift becomes bought', async () => {
    const storage = await createTestStorage();
    const seeded = await seedDashboard(storage);
    await renderApp(['/'], { storage });

    const actualCard = await cardFor('Actual spending');
    expect(actualCard.getByText('$39.00')).toBeInTheDocument();

    await storage.repositories.gifts.setPurchaseState(seeded.candle.id, { bought: true });

    await waitFor(() => {
      expect(actualCard.getByText('$49.00')).toBeInTheDocument();
    });
    expect(screen.getByRole('progressbar', { name: 'Bought progress' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
  });

  it('shows a first-step panel instead of zero-filled progress and charts', async () => {
    const storage = await createTestStorage();
    await storage.repositories.seasons.create({
      name: 'Empty Christmas',
      holidayDate: '2026-12-25',
      budgetMinor: 10000,
    });
    await renderApp(['/'], { storage });

    expect(
      await screen.findByRole('heading', { name: 'Start with your first gift' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add a recipient first' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Gift progress' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('table', { name: 'Budget versus actual spending by recipient' }),
    ).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('renders archived figures without edit controls', async () => {
    const storage = await createTestStorage();
    const { season } = await seedDashboard(storage);
    await storage.repositories.seasons.archive(season.id);
    await storage.db.settings.update('app', { activeSeasonId: season.id });
    await renderApp(['/'], { storage });

    expect(await screen.findByText('Archived · read only')).toBeInTheDocument();
    const budgetCard = await cardFor('Season budget');
    expect(budgetCard.getByText('Read-only archived season')).toBeInTheDocument();
    expect(budgetCard.queryByRole('button', { name: 'Edit budget' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Needs attention' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Backup & archives' })).toBeInTheDocument();
  });
});
