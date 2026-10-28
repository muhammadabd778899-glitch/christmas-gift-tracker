import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createTestStorage, type TestStorage } from '../test/storage';
import { renderApp } from '../test/render';

async function seedIdeas(storage: TestStorage) {
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

  return { season, alex };
}

describe('Idea Bank', () => {
  it('creates an idea and shows it in the bank', async () => {
    const storage = await createTestStorage();
    const { season } = await seedIdeas(storage);
    const user = userEvent.setup();
    await renderApp(['/ideas'], { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Idea Bank' })).toBeInTheDocument();
    expect(await screen.findByText('No ideas yet')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add your first idea' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add an idea' });
    await user.type(within(dialog).getByLabelText(/^Idea name/), 'Book of walks');
    await user.click(within(dialog).getByRole('button', { name: 'Add idea' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Book of walks' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Book of walks was added to the Idea Bank.'),
    ).toBeInTheDocument();
    await expect(storage.repositories.ideas.listBySeason(season.id)).resolves.toHaveLength(1);
  });

  it('rejects purchase links that are not http or https', async () => {
    const storage = await createTestStorage();
    const { season } = await seedIdeas(storage);
    const user = userEvent.setup();
    await renderApp(['/ideas'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Add your first idea' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add an idea' });
    await user.type(within(dialog).getByLabelText(/^Idea name/), 'Unsafe idea');
    await user.type(
      within(dialog).getByLabelText(/^Purchase link \(optional\)/),
      'javascript:alert(1)',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Add idea' }));

    expect(
      await within(dialog).findByText(/Enter a complete http:\/\/ or https:\/\/ link/i),
    ).toBeInTheDocument();
    await expect(storage.repositories.ideas.listBySeason(season.id)).resolves.toHaveLength(0);
  });

  it('requires a recipient choice when converting an idea without one', async () => {
    const storage = await createTestStorage();
    const { season, alex } = await seedIdeas(storage);
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id,
      name: 'Scarf idea',
      category: 'Clothing',
      store: 'Market',
      purchaseUrl: 'https://example.com/scarf',
      estimatedPriceMinor: 2500,
      notes: 'Blue, please.',
    });
    const user = userEvent.setup();
    await renderApp(['/ideas'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Convert to gift' }));
    const dialog = await screen.findByRole('dialog', { name: 'Convert idea to a gift' });
    expect(within(dialog).getByText(/A recipient is required/i)).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText(/^Recipient/), alex.id);
    await user.click(within(dialog).getByRole('button', { name: 'Convert to gift' }));

    expect(await screen.findByText('Converted')).toBeInTheDocument();
    const giftLink = await screen.findByRole('link', {
      name: 'View gift: converted from Scarf idea',
    });
    expect(giftLink.getAttribute('href')).toContain('/gifts#gift-');

    const gifts = await storage.repositories.gifts.listBySeason(season.id);
    expect(gifts).toHaveLength(1);
    expect(gifts[0]).toMatchObject({
      name: 'Scarf idea',
      category: 'Clothing',
      store: 'Market',
      purchaseUrl: 'https://example.com/scarf',
      plannedBudgetMinor: 2500,
      notes: 'Blue, please.',
      sourceIdeaId: idea.id,
      recipientId: alex.id,
      bought: false,
    });

    await expect(storage.repositories.ideas.get(idea.id)).resolves.toMatchObject({
      status: 'converted',
      convertedGiftId: gifts[0].id,
    });
  });

  it('edits an idea without changing its identity', async () => {
    const storage = await createTestStorage();
    const { season } = await seedIdeas(storage);
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id,
      name: 'Old idea name',
      store: 'Old store',
    });
    const user = userEvent.setup();
    await renderApp(['/ideas'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Edit Old idea name' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit idea' });
    const nameInput = within(dialog).getByLabelText(/^Idea name/);
    await user.clear(nameInput);
    await user.type(nameInput, 'New idea name');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'New idea name' }),
    ).toBeInTheDocument();
    await expect(storage.repositories.ideas.get(idea.id)).resolves.toMatchObject({
      id: idea.id,
      name: 'New idea name',
      store: 'Old store',
    });
  });

  it('does not create a duplicate gift when Convert is clicked twice', async () => {
    const storage = await createTestStorage();
    const { season, alex } = await seedIdeas(storage);
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id,
      recipientId: alex.id,
      name: 'Double click idea',
      estimatedPriceMinor: 1200,
    });
    await renderApp(['/ideas'], { storage });

    const convertButton = await screen.findByRole('button', { name: 'Convert to gift' });
    fireEvent.click(convertButton);
    fireEvent.click(convertButton);

    expect(await screen.findByText('Converted')).toBeInTheDocument();
    const gifts = await storage.repositories.gifts.listBySeason(season.id);
    expect(gifts).toHaveLength(1);
    expect(gifts[0].sourceIdeaId).toBe(idea.id);
    await expect(storage.repositories.ideas.get(idea.id)).resolves.toMatchObject({
      status: 'converted',
      convertedGiftId: gifts[0].id,
    });
  });

  it('searches idea name, recipient, category, and store', async () => {
    const storage = await createTestStorage();
    const { season, alex } = await seedIdeas(storage);
    await storage.repositories.ideas.create({
      seasonId: season.id,
      recipientId: alex.id,
      name: 'Book of walks',
      category: 'Books',
      store: 'Bookshop',
    });
    await storage.repositories.ideas.create({
      seasonId: season.id,
      name: 'Warm scarf',
      category: 'Clothing',
      store: 'Market',
    });
    const user = userEvent.setup();
    await renderApp(['/ideas'], { storage });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Book of walks' }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('Search ideas'), 'scarf');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Warm scarf' })).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { level: 2, name: 'Book of walks' }),
      ).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Book of walks' }),
    ).toBeInTheDocument();
  });

  it('deletes an idea after confirmation', async () => {
    const storage = await createTestStorage();
    const { season } = await seedIdeas(storage);
    await storage.repositories.ideas.create({
      seasonId: season.id,
      name: 'Temporary idea',
    });
    const user = userEvent.setup();
    await renderApp(['/ideas'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Delete Temporary idea' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete "Temporary idea"?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete idea' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 2, name: 'Temporary idea' }),
      ).not.toBeInTheDocument();
    });
    await expect(storage.repositories.ideas.listBySeason(season.id)).resolves.toHaveLength(0);
  });

  it('keeps an archived season read-only', async () => {
    const storage = await createTestStorage();
    const { season } = await seedIdeas(storage);
    await storage.repositories.ideas.create({
      seasonId: season.id,
      name: 'Archived idea',
    });
    await storage.repositories.seasons.archive(season.id);
    await storage.db.settings.update('app', { activeSeasonId: season.id });
    await renderApp(['/ideas'], { storage });

    expect(await screen.findByText('Archived · read only')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add idea' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Convert to gift' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit Archived idea/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete Archived idea/ })).not.toBeInTheDocument();
  });
});
