import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './boundaries/AppErrorBoundary';
import { RouteErrorPage } from './boundaries/RouteErrorPage';
import { THEME_STORAGE_KEY } from '../lib/theme';
import { createTestStorage } from '../test/storage';
import { renderApp } from '../test/render';

function Explodes(): never {
  throw new Error('Test explosion');
}

const destinations = [
  { link: 'Dashboard', heading: 'Dashboard' },
  { link: 'Gifts', heading: 'Gifts' },
  { link: 'Recipients', heading: 'Recipients' },
  { link: 'Idea Bank', heading: 'Idea Bank' },
  { link: 'Shopping List', heading: 'Shopping List' },
  { link: 'Seasons', heading: 'Seasons & archives' },
  { link: 'Settings', heading: 'Settings' },
];

describe('application shell', () => {
  it('renders the dashboard with all primary destinations', async () => {
    await renderApp();
    expect(await screen.findByText('No active season')).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();

    const primaryNavigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    for (const destination of destinations) {
      expect(
        within(primaryNavigation).getByRole('link', { name: destination.link }),
      ).toBeInTheDocument();
    }
  });

  it('navigates to every primary destination', async () => {
    const user = userEvent.setup();
    await renderApp();
    expect(await screen.findByText('No active season')).toBeInTheDocument();
    const primaryNavigation = screen.getByRole('navigation', { name: 'Primary navigation' });

    for (const destination of destinations) {
      await user.click(within(primaryNavigation).getByRole('link', { name: destination.link }));

      try {
        await waitFor(
          () => {
            expect(
              screen.getByRole('heading', { level: 1, name: destination.heading }),
            ).toBeInTheDocument();
          },
          { timeout: 3000 },
        );
      } catch (error) {
        throw new Error(`Failed to reach ${destination.link}`, { cause: error });
      }
    }

    await waitFor(() => {
      expect(document.getElementById('main-content')).toHaveFocus();
    });
  });

  it('shows an honest no-season state in the header', async () => {
    await renderApp();

    expect(await screen.findByText('No active season')).toBeInTheDocument();
    expect(screen.getByText('Set up season')).toBeInTheDocument();
  });

  it('opens and closes the about dialog', async () => {
    const user = userEvent.setup();
    await renderApp();
    expect(await screen.findByText('No active season')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'About this build' }));

    const dialog = await screen.findByRole('dialog', { name: 'About this preview' });
    expect(
      within(dialog).getByText('Milestone 11 of 12: Online accounts and synchronization.'),
    ).toBeVisible();
    expect(within(dialog).getByText(/Local-first by default/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog', { name: 'About this preview' })).not.toBeInTheDocument();
  });

  it('applies and persists the theme from the header toggle', async () => {
    const user = userEvent.setup();
    const { storage } = await renderApp();
    expect(await screen.findByText('No active season')).toBeInTheDocument();

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect((await storage.repositories.settings.get()).theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
    expect((await storage.repositories.settings.get()).theme).toBe('light');
  });

  it('restores a saved theme preference after storage loads', async () => {
    const storage = await createTestStorage();
    await storage.repositories.settings.update({ theme: 'dark' });

    await renderApp(['/'], { storage });

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('renders a friendly not-found page for unknown routes', async () => {
    await renderApp(['/this-route-does-not-exist']);
    expect(await screen.findByText('No active season')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { level: 1, name: 'This page slipped out of the stocking.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to dashboard/i })).toBeInTheDocument();
  });

  it('keeps the offline edition free of account navigation and routes', async () => {
    await renderApp(['/account']);
    expect(await screen.findByText('No active season')).toBeInTheDocument();

    const primaryNavigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(
      within(primaryNavigation).queryByRole('link', { name: 'Account' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'This page slipped out of the stocking.' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Sign in to your account')).not.toBeInTheDocument();
  });

  it('shows recovery UI when a render error escapes the app', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppErrorBoundary>
        <Explodes />
      </AppErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'The app hit an unexpected problem.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload app' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('shows recovery UI when a route render error is caught', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <Explodes />,
          errorElement: <RouteErrorPage />,
        },
      ],
      { initialEntries: ['/'] },
    );

    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'This page could not be displayed.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload app' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
