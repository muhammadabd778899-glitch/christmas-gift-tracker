import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestStorage, type TestStorage } from '../test/storage';
import { renderApp } from '../test/render';

let downloaded: string[];

beforeEach(() => {
  downloaded = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloaded.push(this.download);
  });
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => 'blob:test'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function seedSeason(storage: TestStorage, name = 'Christmas 2026') {
  const season = await storage.repositories.seasons.create({
    name,
    holidayDate: '2026-12-25',
    budgetMinor: 50000,
  });
  const recipient = await storage.repositories.recipients.create({
    seasonId: season.id,
    name: 'Alex',
    relationship: 'Family',
  });
  await storage.repositories.gifts.create({
    seasonId: season.id,
    recipientId: recipient.id,
    name: 'Warm scarf',
    plannedBudgetMinor: 2500,
  });

  return season;
}

describe('Seasons and archives page', () => {
  it('shows the active season, no archived seasons, and the data tools', async () => {
    const storage = await createTestStorage();
    await seedSeason(storage);
    await renderApp(['/seasons'], { storage });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Seasons & archives' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('1 active · 1 total')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Christmas 2026' })).toBeInTheDocument();
    expect(screen.getByText(/No archived seasons yet/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Backup and restore' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'CSV export' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Sample data' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Reset all data' })).toBeInTheDocument();
  });

  it('creates a new season only after consenting to archive the current one', async () => {
    const storage = await createTestStorage();
    const user = userEvent.setup();
    await seedSeason(storage);
    await renderApp(['/seasons'], { storage });

    await user.click(await screen.findByRole('button', { name: 'New season' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create a season' });
    const createButton = within(dialog).getByRole('button', { name: 'Create season' });

    expect(createButton).toBeDisabled();

    const nameField = within(dialog).getByLabelText(/Season name/);
    await user.clear(nameField);
    await user.type(nameField, 'Christmas 2027');
    fireEvent.change(within(dialog).getByLabelText(/Holiday date/), {
      target: { value: '2027-12-25' },
    });

    await user.click(
      within(dialog).getByRole('checkbox', {
        name: /Archive Christmas 2026 and make this season active/,
      }),
    );
    expect(createButton).toBeEnabled();
    await user.click(createButton);

    expect(
      await screen.findByText(
        'Christmas 2027 is active. Christmas 2026 was archived, not deleted.',
      ),
    ).toBeInTheDocument();

    const seasons = await storage.repositories.seasons.list();
    expect(seasons).toHaveLength(2);
    expect(seasons.find((season) => season.name === 'Christmas 2027')?.status).toBe('active');
    expect(seasons.find((season) => season.name === 'Christmas 2026')?.status).toBe('archived');
  });

  it('archives the active season into the zero-active state and restores it', async () => {
    const storage = await createTestStorage();
    const user = userEvent.setup();
    await seedSeason(storage);
    await renderApp(['/seasons'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Archive season' }));
    const archiveDialog = await screen.findByRole('dialog', { name: 'Archive Christmas 2026?' });
    await user.click(within(archiveDialog).getByRole('button', { name: 'Archive season' }));

    expect(
      await screen.findByText(
        'Christmas 2026 was archived. It is now read-only and can be restored at any time.',
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No active season' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Christmas 2026' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Restore Christmas 2026' }));
    const restoreDialog = await screen.findByRole('dialog', {
      name: 'Restore Christmas 2026?',
    });
    await user.click(within(restoreDialog).getByRole('button', { name: 'Restore season' }));

    expect(await screen.findByText('Christmas 2026 is active again.')).toBeInTheDocument();
    expect(await screen.findByText('1 active · 1 total')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive season' })).toBeInTheDocument();
  });

  it('restores an archived season and archives the current one in the same step', async () => {
    const storage = await createTestStorage();
    const user = userEvent.setup();
    await seedSeason(storage, 'Christmas 2026');
    await storage.repositories.seasons.create(
      { name: 'Christmas 2027', holidayDate: '2027-12-25' },
      { archiveCurrent: true },
    );
    await renderApp(['/seasons'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Restore' }));
    const dialog = await screen.findByRole('dialog', { name: 'Restore Christmas 2026?' });
    await user.click(within(dialog).getByRole('button', { name: 'Restore and switch' }));

    expect(
      await screen.findByText(
        'Christmas 2026 is active again. Christmas 2027 was archived in the same step and nothing was deleted.',
      ),
    ).toBeInTheDocument();

    const seasons = await storage.repositories.seasons.list();
    expect(seasons.find((season) => season.name === 'Christmas 2026')?.status).toBe('active');
    expect(seasons.find((season) => season.name === 'Christmas 2027')?.status).toBe('archived');
  });

  it('deletes an archived season only after typing its exact name', async () => {
    const storage = await createTestStorage();
    const user = userEvent.setup();
    const season = await seedSeason(storage);
    await storage.repositories.seasons.archive(season.id);
    await renderApp(['/seasons'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete Christmas 2026?' });
    const deleteButton = within(dialog).getByRole('button', {
      name: 'Delete season permanently',
    });

    expect(deleteButton).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/to confirm/), 'christmas 2026');
    expect(deleteButton).toBeDisabled();
    await user.clear(within(dialog).getByLabelText(/to confirm/));
    await user.type(within(dialog).getByLabelText(/to confirm/), 'Christmas 2026');
    expect(deleteButton).toBeEnabled();
    await user.click(deleteButton);

    expect(
      await screen.findByText(
        'Christmas 2026 and its records were deleted permanently. A backup is the only way to recover them.',
      ),
    ).toBeInTheDocument();
    await expect(storage.repositories.seasons.list()).resolves.toHaveLength(0);
  });

  it('rejects a file that is not a backup without enabling restore', async () => {
    const storage = await createTestStorage();
    const user = userEvent.setup();
    await renderApp(['/seasons'], { storage });

    const input = await screen.findByLabelText('Choose a backup file');
    await user.upload(input, new File(['{"format":"something-else"}'], 'wrong.json'));

    expect(
      await screen.findByText(/That file is not a Christmas Gift Tracker backup/),
    ).toBeInTheDocument();
    expect(screen.queryByText('This file is a valid backup.')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Restore backup (replace all data)' }),
    ).not.toBeInTheDocument();
  });

  it('requires a fresh download and the typed word before restoring a valid backup', async () => {
    const storage = await createTestStorage();
    const user = userEvent.setup();
    await seedSeason(storage);
    await renderApp(['/seasons'], { storage });

    const backup = await storage.repositories.data.exportBackup();
    const input = await screen.findByLabelText('Choose a backup file');
    await user.upload(
      input,
      new File([backup.content], 'backup.json', { type: 'application/json' }),
    );

    expect(await screen.findByText('This file is a valid backup.')).toBeInTheDocument();
    const restoreButton = screen.getByRole('button', {
      name: 'Restore backup (replace all data)',
    });
    expect(restoreButton).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: 'Download current data before restoring' }),
    );
    expect(downloaded[0]).toMatch(/^christmas-gift-tracker-backup-.*\.json$/);
    expect(restoreButton).toBeDisabled();

    await user.type(screen.getByLabelText(/Type RESTORE/), 'RESTORE');
    expect(restoreButton).toBeEnabled();
    await user.click(restoreButton);

    expect(await screen.findByText(/Backup restored: 1 season/)).toBeInTheDocument();
    expect(screen.queryByText('This file is a valid backup.')).not.toBeInTheDocument();
    await expect(storage.repositories.seasons.list()).resolves.toHaveLength(1);
  });

  it('downloads a CSV export and summarises the rows', async () => {
    const storage = await createTestStorage();
    const user = userEvent.setup();
    await seedSeason(storage);
    await renderApp(['/seasons'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Download CSV' }));

    expect(await screen.findByText('1 gift row from 1 season exported.')).toBeInTheDocument();
    expect(downloaded[0]).toMatch(/^christmas-gift-tracker-gifts-.*\.csv$/);
  });

  it('loads sample data and removes only the sample season', async () => {
    const storage = await createTestStorage();
    const user = userEvent.setup();
    await renderApp(['/seasons'], { storage });

    await user.click(await screen.findByRole('button', { name: 'Load sample data' }));

    expect(
      await screen.findByText(
        'The sample season was added and is active. It is labeled everywhere it appears.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('Sample data')).toBeInTheDocument();
    const seasons = await storage.repositories.seasons.list();
    expect(seasons).toHaveLength(1);
    expect(seasons[0]?.isSample).toBe(true);

    await user.click(await screen.findByRole('button', { name: 'Remove sample data' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remove sample data?' });
    await user.click(within(dialog).getByRole('button', { name: 'Remove sample data' }));

    expect(await screen.findByText(/Sample data was removed: 1 season/)).toBeInTheDocument();
    await expect(storage.repositories.seasons.list()).resolves.toHaveLength(0);
    expect(await screen.findByRole('button', { name: 'Load sample data' })).toBeInTheDocument();
  });

  it('resets everything only after a backup and DELETE, then returns to onboarding', async () => {
    const storage = await createTestStorage();
    const user = userEvent.setup();
    await seedSeason(storage);
    await renderApp(['/seasons'], { storage });

    const resetButton = await screen.findByRole('button', { name: 'Reset all data' });
    expect(resetButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Download backup first' }));
    expect(await screen.findByText(/Backup downloaded/)).toBeInTheDocument();
    expect(downloaded[0]).toMatch(/^christmas-gift-tracker-backup-.*\.json$/);
    expect(resetButton).toBeDisabled();

    await user.type(screen.getByLabelText(/Type DELETE/), 'DELETE');
    await waitFor(() => expect(resetButton).toBeEnabled());
    await user.click(resetButton);

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Set the scene for this Christmas' },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('All planner data was cleared. A fresh, empty planner is ready.'),
    ).toBeInTheDocument();
    await expect(storage.repositories.seasons.list()).resolves.toHaveLength(0);
  });
});
