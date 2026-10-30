import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isServiceWorkerSupported } from '../../pwa/support';
import { usePwaUpdate } from '../../pwa/usePwaUpdate';
import { UpdatePrompt } from './UpdatePrompt';

vi.mock('../../pwa/support', () => ({
  isServiceWorkerSupported: vi.fn(() => true),
}));

vi.mock('../../pwa/usePwaUpdate', () => ({
  usePwaUpdate: vi.fn(),
}));

function setUpUpdate(state: { needRefresh?: boolean; offlineReady?: boolean } = {}): {
  dismiss: ReturnType<typeof vi.fn>;
  applyUpdate: ReturnType<typeof vi.fn>;
} {
  const dismiss = vi.fn();
  const applyUpdate = vi.fn().mockResolvedValue(undefined);

  vi.mocked(usePwaUpdate).mockReturnValue({
    needRefresh: state.needRefresh ?? false,
    offlineReady: state.offlineReady ?? false,
    dismiss,
    applyUpdate,
  });

  return { dismiss, applyUpdate };
}

beforeEach(() => {
  vi.mocked(isServiceWorkerSupported).mockReturnValue(true);
  setUpUpdate();
});

afterEach(() => {
  document.querySelectorAll('dialog').forEach((dialog) => dialog.remove());
});

describe('UpdatePrompt', () => {
  it('renders nothing when the browser cannot register a service worker', () => {
    vi.mocked(isServiceWorkerSupported).mockReturnValue(false);

    const { container } = render(<UpdatePrompt />);

    expect(container).toBeEmptyDOMElement();
    expect(usePwaUpdate).not.toHaveBeenCalled();
  });

  it('renders nothing when there is no update or offline status', () => {
    const { container } = render(<UpdatePrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it('announces offline readiness and dismisses on request', async () => {
    const user = userEvent.setup();
    const { dismiss } = setUpUpdate({ offlineReady: true });

    render(<UpdatePrompt />);

    expect(screen.getByRole('status')).toHaveTextContent('Ready to work offline.');
    expect(screen.getByText(/saved what it needs for offline use/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Got it' }));

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('lets the user postpone an update', async () => {
    const user = userEvent.setup();
    const { dismiss, applyUpdate } = setUpUpdate({ needRefresh: true });

    render(<UpdatePrompt />);

    expect(screen.getByRole('status')).toHaveTextContent('A new version is ready.');
    expect(screen.getByText(/Your saved planner data stays on this device/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Later' }));

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it('applies the update when the user reloads', async () => {
    const user = userEvent.setup();
    const { applyUpdate } = setUpUpdate({ needRefresh: true });

    render(<UpdatePrompt />);

    await user.click(screen.getByRole('button', { name: 'Reload to update' }));

    await waitFor(() => expect(applyUpdate).toHaveBeenCalledTimes(1));
  });

  it('never reloads while a dialog is open', async () => {
    const user = userEvent.setup();
    const { applyUpdate } = setUpUpdate({ needRefresh: true });
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.append(dialog);

    render(<UpdatePrompt />);

    await user.click(screen.getByRole('button', { name: 'Reload to update' }));

    expect(applyUpdate).not.toHaveBeenCalled();
    expect(
      screen.getByText('Close any open dialog first so unsaved work is not discarded.'),
    ).toBeVisible();

    dialog.remove();
    await user.click(screen.getByRole('button', { name: 'Reload to update' }));

    await waitFor(() => expect(applyUpdate).toHaveBeenCalledTimes(1));
  });
});
