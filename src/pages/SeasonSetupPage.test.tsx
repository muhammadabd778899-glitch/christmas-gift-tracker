import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createTestStorage } from '../test/storage';
import { renderApp } from '../test/render';

async function addSeason(storage: Awaited<ReturnType<typeof createTestStorage>>) {
  return storage.repositories.seasons.create({
    name: 'Christmas 2026',
    holidayDate: '2026-12-25',
    budgetMinor: 50000,
  });
}

describe('Season setup page', () => {
  it('creates a first season explicitly and proceeds to recipients', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await renderApp(['/onboarding'], { storage });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Set the scene for this Christmas' }),
    ).toBeInTheDocument();
    await expect(storage.repositories.seasons.list()).resolves.toHaveLength(0);

    const nameInput = screen.getByLabelText(/Season name/);
    await user.clear(nameInput);
    await user.type(nameInput, 'Our Family Christmas');
    fireEvent.change(screen.getByLabelText(/Holiday date/), {
      target: { value: '2026-12-24' },
    });
    await user.type(screen.getByLabelText(/Overall season budget/), '750.25');
    await user.click(screen.getByRole('button', { name: 'Create season' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recipients' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Our Family Christmas is ready. Add the first person you are planning for.',
      ),
    ).toBeInTheDocument();

    const seasons = await storage.repositories.seasons.list();
    expect(seasons).toHaveLength(1);
    expect(seasons[0]).toMatchObject({
      name: 'Our Family Christmas',
      holidayDate: '2026-12-24',
      budgetMinor: 75025,
      status: 'active',
      isSample: false,
    });
    const settings = await storage.repositories.settings.get();
    expect(settings.activeSeasonId).toBe(seasons[0].id);
  });

  it('allows the season budget to be left blank', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await renderApp(['/onboarding'], { storage });

    await screen.findByRole('heading', { level: 1, name: 'Set the scene for this Christmas' });
    await user.click(screen.getByRole('button', { name: 'Create season' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recipients' }),
    ).toBeInTheDocument();
    const [season] = await storage.repositories.seasons.list();
    expect(season.budgetMinor).toBeNull();
  });

  it('rejects an invalid budget without creating a season', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await renderApp(['/onboarding'], { storage });

    await screen.findByRole('heading', { level: 1, name: 'Set the scene for this Christmas' });
    await user.type(screen.getByLabelText(/Overall season budget/), '-5');
    await user.click(screen.getByRole('button', { name: 'Create season' }));

    expect(
      await screen.findByText('Enter an amount using digits, a decimal point, or a decimal comma.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Overall season budget/)).toHaveAttribute('aria-invalid', 'true');
    await expect(storage.repositories.seasons.list()).resolves.toHaveLength(0);
  });

  it('requires a season name', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await renderApp(['/onboarding'], { storage });

    await screen.findByRole('heading', { level: 1, name: 'Set the scene for this Christmas' });
    await user.clear(screen.getByLabelText(/Season name/));
    await user.click(screen.getByRole('button', { name: 'Create season' }));

    expect(await screen.findByText('Season name is required.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Season name/)).toHaveAttribute('aria-invalid', 'true');
    await expect(storage.repositories.seasons.list()).resolves.toHaveLength(0);
  });

  it('does not offer first-season creation when a season already exists', async () => {
    const storage = await createTestStorage();
    await addSeason(storage);
    await renderApp(['/onboarding'], { storage });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your season is ready' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create season' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage recipients/ })).toBeInTheDocument();
    await expect(storage.repositories.seasons.list()).resolves.toHaveLength(1);
  });

  it('shows an archived season as read-only instead of silently replacing it', async () => {
    const storage = await createTestStorage();
    const season = await addSeason(storage);
    const archived = await storage.repositories.seasons.archive(season.id);
    await storage.db.settings.update('app', { activeSeasonId: archived.id });
    await renderApp(['/onboarding'], { storage });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'This season is archived' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create season' })).not.toBeInTheDocument();
    expect(screen.getByText(/archive tools in Milestone 8/)).toBeInTheDocument();
  });
});
