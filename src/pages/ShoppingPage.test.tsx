import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createTestStorage, type TestStorage } from '../test/storage';
import { renderApp } from '../test/render';

async function seedShopping(storage: TestStorage) {
  const season = await storage.repositories.seasons.create({
    name: 'Christmas 2026',
    holidayDate: '2026-12-25',
    budgetMinor: 50000,
  });
  const alex = await storage.repositories.recipients.create({
    seasonId: season.id,
    name: 'Alex',
    relationship: 'Family',
    budgetCapMinor: null,
  });
  const blair = await storage.repositories.recipients.create({
    seasonId: season.id,
    name: 'Blair',
    relationship: 'Friend',
    budgetCapMinor: null,
  });
  const scarf = await storage.repositories.gifts.create({
    seasonId: season.id,
    recipientId: alex.id,
    name: 'Scarf',
    category: 'Clothing',
    store: 'Market',
    purchaseUrl: 'https://example.com/scarf',
    plannedBudgetMinor: 2500,
  });
  const book = await storage.repositories.gifts.create({
    seasonId: season.id,
    recipientId: blair.id,
    name: 'Book',
    store: 'Bookshop',
    plannedBudgetMinor: 1800,
  });
  const mystery = await storage.repositories.gifts.create({
    seasonId: season.id,
    recipientId: alex.id,
    name: 'Mystery gift',
    store: null,
    plannedBudgetMinor: null,
  });
  const bought = await storage.repositories.gifts.create({
    seasonId: season.id,
    recipientId: blair.id,
    name: 'Bought gift',
    store: 'Market',
    plannedBudgetMinor: 9999,
    bought: true,
    actualCostMinor: 9000,
  });
  await storage.repositories.ideas.create({
    seasonId: season.id,
    name: 'Unconverted idea',
    store: 'Market',
    estimatedPriceMinor: 9999,
  });

  return { season, alex, blair, scarf, book, mystery, bought };
}

describe('Shopping List', () => {
  it('groups unbought gifts by store, excludes bought gifts, and shows subtotals', async () => {
    const storage = await createTestStorage();
    await seedShopping(storage);
    await renderApp(['/shopping'], { storage });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Shopping List' }),
    ).toBeInTheDocument();

    const groupHeadings = await screen.findAllByRole('heading', { level: 2 });
    expect(groupHeadings.map((heading) => heading.textContent)).toEqual([
      'Bookshop',
      'Market',
      'No store specified',
    ]);

    const marketSection = groupHeadings[1].closest('section');
    expect(marketSection).not.toBeNull();
    const market = within(marketSection as HTMLElement);
    expect(market.getByText('Scarf')).toBeInTheDocument();
    expect(market.getByText('Alex')).toBeInTheDocument();
    expect(market.getAllByText('$25.00')).toHaveLength(2);

    const noStoreSection = groupHeadings[2].closest('section');
    const noStore = within(noStoreSection as HTMLElement);
    expect(noStore.getByText('Mystery gift')).toBeInTheDocument();
    expect(noStore.getByText('Not set')).toBeInTheDocument();
    expect(noStore.getAllByText('$0.00').length).toBeGreaterThanOrEqual(1);

    expect(screen.queryByText('Bought gift')).not.toBeInTheDocument();
    expect(screen.queryByText('Unconverted idea')).not.toBeInTheDocument();
    expect(screen.getAllByText('$43.00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('3 gifts to buy')).toBeInTheDocument();
  });

  it('marks an item bought, removes it from the list, and persists the change', async () => {
    const storage = await createTestStorage();
    const { scarf } = await seedShopping(storage);
    const user = userEvent.setup();
    await renderApp(['/shopping'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Mark bought: Scarf' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Mark bought: Scarf' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText(/Scarf was marked bought/i)).toBeInTheDocument();
    await expect(storage.repositories.gifts.get(scarf.id)).resolves.toMatchObject({
      bought: true,
      actualCostMinor: null,
    });
  });

  it('offers a print view with a title, season, date, and no controls in the print header', async () => {
    const storage = await createTestStorage();
    await seedShopping(storage);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const user = userEvent.setup();
    await renderApp(['/shopping'], { storage });

    const printButton = await screen.findByRole('button', { name: 'Print list' });
    expect(printButton).toHaveAttribute('data-print-hide');
    expect(screen.getByRole('button', { name: 'Mark bought: Scarf' })).toHaveAttribute(
      'data-print-hide',
    );

    const printRoot = document.querySelector('[data-print-root]');
    expect(printRoot).not.toBeNull();
    const printView = within(printRoot as HTMLElement);
    expect(printView.getByText('Christmas Gift Tracker')).toBeInTheDocument();
    expect(printView.getByText(/Christmas 2026 · Printed/)).toBeInTheDocument();

    await user.click(printButton);
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('shows useful empty states when there are no gifts', async () => {
    const storage = await createTestStorage();
    await storage.repositories.seasons.create({
      name: 'Christmas 2026',
      holidayDate: '2026-12-25',
      budgetMinor: 50000,
    });
    await renderApp(['/shopping'], { storage });

    expect(await screen.findByText('No gifts yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add gifts' })).toHaveAttribute('href', '/gifts');
    expect(screen.queryByRole('button', { name: 'Print list' })).not.toBeInTheDocument();
  });

  it('does not offer mark-bought controls in an archived season', async () => {
    const storage = await createTestStorage();
    const { season } = await seedShopping(storage);
    await storage.repositories.seasons.archive(season.id);
    await storage.db.settings.update('app', { activeSeasonId: season.id });
    await renderApp(['/shopping'], { storage });

    expect(await screen.findByText('Archived · read only')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark bought:/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('Read only').length).toBeGreaterThanOrEqual(1);
  });
});
