import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './boundaries/AppErrorBoundary';
import { RouteErrorPage } from './boundaries/RouteErrorPage';
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
  { link: 'Archives', heading: 'Archives' },
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
      within(dialog).getByText('Milestone 6 of 12: Idea Bank and Shopping List.'),
    ).toBeVisible();
    expect(within(dialog).getByText(/Local and account-free/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog', { name: 'About this preview' })).not.toBeInTheDocument();
  });

  it('renders a friendly not-found page for unknown routes', async () => {
    await renderApp(['/this-route-does-not-exist']);
    expect(await screen.findByText('No active season')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { level: 1, name: 'This page slipped out of the stocking.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to dashboard/i })).toBeInTheDocument();
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
