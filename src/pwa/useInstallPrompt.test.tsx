import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useInstallPrompt } from './useInstallPrompt';

function Harness() {
  const { canInstall, installed, install } = useInstallPrompt();
  const [outcome, setOutcome] = useState('pending');

  return (
    <div>
      <span data-testid="can-install">{canInstall ? 'yes' : 'no'}</span>
      <span data-testid="installed">{installed ? 'yes' : 'no'}</span>
      <span data-testid="outcome">{outcome}</span>
      <button type="button" onClick={() => void install().then(setOutcome)}>
        install
      </button>
    </div>
  );
}

function createInstallEvent(outcome: 'accepted' | 'dismissed') {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = new Event('beforeinstallprompt', { cancelable: true });

  Object.defineProperty(event, 'prompt', { value: prompt });
  Object.defineProperty(event, 'userChoice', {
    value: Promise.resolve({ outcome, platform: 'web' }),
  });

  return { event, prompt };
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('useInstallPrompt', () => {
  it('starts unavailable when the browser never offers an install prompt', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByTestId('can-install')).toHaveTextContent('no');
    expect(screen.getByTestId('installed')).toHaveTextContent('no');

    await user.click(screen.getByRole('button', { name: 'install' }));

    expect(await screen.findByTestId('outcome')).toHaveTextContent('unavailable');
  });

  it('reports an accepted install and marks the app installed', async () => {
    const user = userEvent.setup();
    const { event, prompt } = createInstallEvent('accepted');
    render(<Harness />);

    act(() => {
      window.dispatchEvent(event);
    });

    expect(screen.getByTestId('can-install')).toHaveTextContent('yes');

    await user.click(screen.getByRole('button', { name: 'install' }));

    await waitFor(() => expect(screen.getByTestId('outcome')).toHaveTextContent('accepted'));
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('installed')).toHaveTextContent('yes');
    expect(screen.getByTestId('can-install')).toHaveTextContent('no');
  });

  it('reports a dismissed install without marking the app installed', async () => {
    const user = userEvent.setup();
    const { event } = createInstallEvent('dismissed');
    render(<Harness />);

    act(() => {
      window.dispatchEvent(event);
    });

    await user.click(screen.getByRole('button', { name: 'install' }));

    await waitFor(() => expect(screen.getByTestId('outcome')).toHaveTextContent('dismissed'));
    expect(screen.getByTestId('installed')).toHaveTextContent('no');
    expect(screen.getByTestId('can-install')).toHaveTextContent('no');
  });

  it('marks the app installed when the browser fires appinstalled', () => {
    render(<Harness />);

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(screen.getByTestId('installed')).toHaveTextContent('yes');
  });

  it('detects standalone launch through the display mode', () => {
    window.matchMedia = ((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    render(<Harness />);

    expect(screen.getByTestId('installed')).toHaveTextContent('yes');
  });
});
