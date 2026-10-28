import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Gift } from '../../domain/entities';
import type { GiftCreateInput, IdeaCreateInput, RecipientCreateInput } from '../../domain/schemas';
import { createTestStorage, type TestStorage } from '../../test/storage';
import { renderApp } from '../../test/render';

async function setupScene(storage: TestStorage) {
  const season = await storage.repositories.seasons.create({
    name: 'Christmas 2026',
    holidayDate: '2026-12-25',
    budgetMinor: 50000,
  });
  const alex = await storage.repositories.recipients.create({
    seasonId: season.id as RecipientCreateInput['seasonId'],
    name: 'Alex',
  });
  const gift = await storage.repositories.gifts.create({
    seasonId: season.id as GiftCreateInput['seasonId'],
    recipientId: alex.id as GiftCreateInput['recipientId'],
    name: 'Doomed gift',
  });
  return { season, alex, gift };
}

describe('DeleteGiftDialog', () => {
  it('deletes the gift on confirm and reports the result', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const { gift } = await setupScene(storage);
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Delete Doomed gift' }));
    await screen.findByRole('dialog', { name: 'Delete "Doomed gift"?' });
    await user.click(screen.getByRole('button', { name: 'Delete gift' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await screen.findByText(/Doomed gift was deleted/)).toBeInTheDocument();
    await expect(storage.repositories.gifts.listBySeason(gift.seasonId)).resolves.toHaveLength(0);
  });

  it('cancels without modifying any records', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await setupScene(storage);
    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Delete Doomed gift' }));
    await screen.findByRole('dialog', { name: 'Delete "Doomed gift"?' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Doomed gift')).toBeInTheDocument();
    await expect(storage.db.gifts.count()).resolves.toBe(1);
  });

  it('reopens the linked idea when a gift-from-idea is deleted', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await storage.repositories.seasons.create({
      name: 'Christmas 2026',
      holidayDate: '2026-12-25',
    });
    const alex = await storage.repositories.recipients.create({
      seasonId: season.id as RecipientCreateInput['seasonId'],
      name: 'Alex',
    });
    const idea = await storage.repositories.ideas.create({
      seasonId: season.id as IdeaCreateInput['seasonId'],
      recipientId: alex.id as IdeaCreateInput['recipientId'],
      name: 'Book of walks',
    });
    // Create a gift that carries the sourceIdeaId (manually marking idea as converted)
    const giftId = await storage.db.transaction(
      'rw',
      storage.db.gifts,
      storage.db.ideas,
      async () => {
        const now = new Date().toISOString();
        const id = crypto.randomUUID() as Gift['id'];
        await storage.db.gifts.add({
          id,
          seasonId: season.id,
          recipientId: alex.id,
          name: 'Converted book',
          category: null,
          store: null,
          purchaseUrl: null,
          plannedBudgetMinor: null,
          actualCostMinor: null,
          bought: false,
          boughtOn: null,
          wrapped: false,
          wrappedOn: null,
          sent: false,
          sentOn: null,
          deliveryMethod: null,
          address: null,
          notes: null,
          sourceIdeaId: idea.id,
          createdAt: now,
          updatedAt: now,
        });
        await storage.db.ideas.update(idea.id, {
          status: 'converted',
          convertedGiftId: id as Gift['id'],
          convertedAt: now,
          updatedAt: now,
        });
        return id;
      },
    );

    await renderApp(['/gifts'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Delete Converted book' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete "Converted book"?' });
    expect(dialog).toHaveTextContent(/original idea/);
    await user.click(screen.getByRole('button', { name: 'Delete gift' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    const reopenedIdea = await storage.repositories.ideas.get(idea.id);
    expect(reopenedIdea.status).toBe('active');
    expect(reopenedIdea.convertedGiftId).toBeNull();
    await expect(storage.db.gifts.get(giftId as Gift['id'])).resolves.toBeUndefined();
  });
});
