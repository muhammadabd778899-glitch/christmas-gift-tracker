import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createTestStorage } from '../test/storage';
import { renderApp } from '../test/render';

function cardFor(headingName: string): HTMLElement {
  const heading = screen.getByRole('heading', { level: 2, name: headingName });
  const card = heading.closest('section');

  if (!(card instanceof HTMLElement)) {
    throw new Error(`Card for ${headingName} was not found.`);
  }

  return card;
}

describe('Settings page', () => {
  it('renders appearance, currency, diagnostics, and data tools', async () => {
    const storage = await createTestStorage();
    await renderApp(['/settings'], { storage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Currency display' })).toBeInTheDocument();

    expect(screen.getByRole('radio', { name: /^Light/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /^Dark/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /^System/ })).toBeChecked();

    expect(await screen.findByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('No integrity issues found.')).toBeInTheDocument();

    const dataLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/seasons#data-tools');
    expect(dataLinks).toHaveLength(4);
  });

  it('saves the theme choice from the appearance card', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await renderApp(['/settings'], { storage });

    await user.click(await screen.findByRole('radio', { name: /^Dark/ }));

    await waitFor(async () => {
      expect((await storage.repositories.settings.get()).theme).toBe('dark');
    });
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(await screen.findByText('Dark theme saved.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Dark/ })).toBeChecked();
  });

  it('saves currency display settings when no monetary data exists', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await renderApp(['/settings'], { storage });

    await user.selectOptions(await screen.findByLabelText('Currency'), 'EUR');
    expect(screen.getByLabelText('Currency code')).toHaveValue('EUR');
    expect(screen.getByLabelText('Symbol')).toHaveValue('€');

    await user.click(screen.getByRole('button', { name: 'Save currency display' }));

    expect(
      await screen.findByText('Currency display saved. Stored amounts were not converted.'),
    ).toBeInTheDocument();

    const settings = await storage.repositories.settings.get();
    expect(settings.currencyCode).toBe('EUR');
    expect(settings.currencySymbol).toBe('€');
    expect(settings.fractionDigits).toBe(2);
  });

  it('requires confirmation when monetary data exists and never rewrites stored values', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    const season = await storage.repositories.seasons.create({
      name: 'Christmas 2026',
      holidayDate: '2026-12-25',
      budgetMinor: 50000,
    });

    await renderApp(['/settings'], { storage });

    await user.selectOptions(await screen.findByLabelText('Currency'), 'GBP');
    await user.click(screen.getByRole('button', { name: 'Save currency display' }));

    const dialog = await screen.findByRole('dialog', {
      name: 'Change how money is displayed?',
    });
    expect(
      within(dialog).getByText(/does not convert currencies, change any stored value/i),
    ).toBeVisible();

    expect((await storage.repositories.settings.get()).currencyCode).toBe('USD');
    expect((await storage.repositories.seasons.get(season.id)).budgetMinor).toBe(50000);

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Change how money is displayed?' })).toBeNull(),
    );
    expect((await storage.repositories.settings.get()).currencyCode).toBe('USD');

    await user.click(screen.getByRole('button', { name: 'Save currency display' }));
    const confirmDialog = await screen.findByRole('dialog', {
      name: 'Change how money is displayed?',
    });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Save display settings' }));

    await waitFor(async () => {
      expect((await storage.repositories.settings.get()).currencyCode).toBe('GBP');
    });
    expect((await storage.repositories.seasons.get(season.id)).budgetMinor).toBe(50000);
  });

  it('validates custom currency fields before saving', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await renderApp(['/settings'], { storage });

    const symbol = await screen.findByLabelText('Symbol');
    await user.clear(symbol);
    await user.click(screen.getByRole('button', { name: 'Save currency display' }));

    expect(await screen.findByText('Enter a currency symbol.')).toBeInTheDocument();
    expect((await storage.repositories.settings.get()).currencySymbol).toBe('$');
  });

  it('shows diagnostics counts without personal data', async () => {
    const storage = await createTestStorage();
    const season = await storage.repositories.seasons.create({
      name: 'Christmas 2026',
      holidayDate: '2026-12-25',
    });
    const recipient = await storage.repositories.recipients.create({
      seasonId: season.id,
      name: 'Alex Morgan',
      notes: 'Private note that must stay out of diagnostics.',
    });
    await storage.repositories.gifts.create({
      seasonId: season.id,
      recipientId: recipient.id,
      name: 'Wool scarf',
    });

    await renderApp(['/settings'], { storage });

    expect(await screen.findByText('No integrity issues found.')).toBeInTheDocument();

    const diagnostics = cardFor('Storage health');
    const recipientCount = within(diagnostics).getByText('Recipients').closest('div');

    expect(recipientCount).not.toBeNull();
    expect(within(recipientCount as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(within(diagnostics).queryByText('Alex Morgan')).not.toBeInTheDocument();
    expect(
      within(diagnostics).queryByText(/Private note that must stay out of diagnostics/),
    ).not.toBeInTheDocument();
  });

  it('links to the data tools section on the seasons page', async () => {
    const user = userEvent.setup();
    const storage = await createTestStorage();
    await renderApp(['/settings'], { storage });

    await user.click(await screen.findByRole('link', { name: /Backup and restore/ }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Seasons & archives' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(document.getElementById('data-tools')).toHaveFocus();
    });
  });
});
