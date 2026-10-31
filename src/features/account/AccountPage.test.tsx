import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OnlineSyncContextValue } from '../../app/online/onlineSyncContext';
import type { ConnectionPlan } from '../../sync/connect';
import type { SyncConflict } from '../../storage/syncTypes';
import AccountPage from './AccountPage';

const auth = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signOutAccount: vi.fn(),
  sendPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  exportAccountData: vi.fn(),
  deleteAccount: vi.fn(),
}));

const downloadTextFile = vi.hoisted(() => vi.fn());
const exportBackup = vi.hoisted(() => vi.fn());

const syncState = vi.hoisted(() => ({ current: null as OnlineSyncContextValue | null }));

vi.mock('../../app/online/onlineSyncContext', () => ({
  useOnlineSync: () => syncState.current,
}));

vi.mock('../../sync/supabase/auth', () => ({
  DELETE_ACCOUNT_CONFIRMATION: 'DELETE MY ACCOUNT',
  signInWithEmail: auth.signInWithEmail,
  signUpWithEmail: auth.signUpWithEmail,
  signOutAccount: auth.signOutAccount,
  sendPasswordReset: auth.sendPasswordReset,
  updatePassword: auth.updatePassword,
  exportAccountData: auth.exportAccountData,
  deleteAccount: auth.deleteAccount,
}));

vi.mock('../../lib/download', () => ({ downloadTextFile }));

vi.mock('../../app/providers/storageContext', () => ({
  useRepositories: () => ({
    data: { exportBackup },
  }),
}));

function plan(overrides: Partial<ConnectionPlan> = {}): ConnectionPlan {
  return {
    mode: 'upload',
    localRecords: 4,
    cloudRecords: 0,
    identical: 0,
    localOnly: 4,
    cloudOnly: 0,
    conflicts: 0,
    ...overrides,
  };
}

function makeSync(overrides: Partial<OnlineSyncContextValue> = {}): OnlineSyncContextValue {
  return {
    ready: true,
    user: null,
    link: null,
    status: {
      state: 'local',
      message: null,
      email: null,
      pendingCount: 0,
      conflictCount: 0,
      lastSyncedAt: null,
    },
    conflicts: [],
    syncing: false,
    online: true,
    error: null,
    clearError: vi.fn(),
    reloadSession: vi.fn(async () => undefined),
    refresh: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    planConnection: vi.fn(async () => plan()),
    connectDevice: vi.fn(async () => ({
      plan: plan(),
      summary: { pushed: 4, pulled: 4, conflicts: 0, pending: 0 },
    })),
    disconnectDevice: vi.fn(async () => undefined),
    resolve: vi.fn(async () => undefined),
    ...overrides,
  };
}

function signedIn(overrides: Partial<OnlineSyncContextValue> = {}): OnlineSyncContextValue {
  return makeSync({
    user: { id: 'user-1', email: 'alex@example.com' },
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  syncState.current = makeSync();
  exportBackup.mockResolvedValue({
    filename: 'gift-tracker-backup.json',
    content: '{}',
    summary: { seasons: 1, recipients: 1, gifts: 1, ideas: 0 },
  });
  auth.signInWithEmail.mockResolvedValue({ id: 'user-1', email: 'alex@example.com' });
  auth.signUpWithEmail.mockResolvedValue({
    user: { id: 'user-1', email: 'alex@example.com' },
    needsEmailConfirmation: false,
  });
  auth.signOutAccount.mockResolvedValue(undefined);
  auth.deleteAccount.mockResolvedValue(undefined);
  auth.updatePassword.mockResolvedValue(undefined);
});

describe('account page', () => {
  it('signs in with an email and password', async () => {
    const user = userEvent.setup();
    render(<AccountPage />);

    expect(screen.getByRole('heading', { name: 'Sign in to your account' })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Email address/), 'alex@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'correct-horse');
    const form = screen.getByRole('form', { name: 'Sign in form' });
    await user.click(within(form).getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(auth.signInWithEmail).toHaveBeenCalledWith('alex@example.com', 'correct-horse'),
    );
    expect(syncState.current?.reloadSession).toHaveBeenCalled();
    expect(
      await screen.findByText('Signed in. Connect this device to start syncing.'),
    ).toBeInTheDocument();
  });

  it('shows a clear message when sign-in fails', async () => {
    const user = userEvent.setup();
    auth.signInWithEmail.mockRejectedValue(new Error('network down'));
    render(<AccountPage />);

    await user.type(screen.getByLabelText(/Email address/), 'alex@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'correct-horse');
    const form = screen.getByRole('form', { name: 'Sign in form' });
    await user.click(within(form).getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The account request could not be completed.');
  });

  it('connects an empty account after the typed confirmation', async () => {
    const user = userEvent.setup();
    syncState.current = signedIn();
    render(<AccountPage />);

    await user.click(screen.getByRole('button', { name: 'Connect this device' }));
    const dialog = await screen.findByRole('dialog', { name: 'Connect this device' });

    expect(await within(dialog).findByText(/account is empty/i)).toBeInTheDocument();
    const connectButton = within(dialog).getByRole('button', { name: 'Connect' });
    expect(connectButton).toBeDisabled();

    await user.type(within(dialog).getByLabelText('Type CONNECT to confirm'), 'CONNECT');
    expect(connectButton).toBeEnabled();

    await user.click(connectButton);

    await waitFor(() =>
      expect(syncState.current?.connectDevice).toHaveBeenCalledWith({
        confirmation: 'CONNECT',
        backupTaken: true,
      }),
    );
    expect(await screen.findByText(/Connected\. 4 sent, 4 received/)).toBeInTheDocument();
  });

  it('requires a downloaded backup before merging', async () => {
    const user = userEvent.setup();
    syncState.current = signedIn({
      planConnection: vi.fn(async () =>
        plan({ mode: 'merge', cloudRecords: 3, localOnly: 1, cloudOnly: 1, conflicts: 1 }),
      ),
    });
    render(<AccountPage />);

    await user.click(screen.getByRole('button', { name: 'Connect this device' }));
    const dialog = await screen.findByRole('dialog', { name: 'Connect this device' });

    expect(await within(dialog).findByText(/will be combined/i)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Type CONNECT to confirm'), 'CONNECT');
    const connectButton = within(dialog).getByRole('button', { name: 'Connect' });
    expect(connectButton).toBeDisabled();

    await user.click(within(dialog).getByRole('button', { name: 'Download backup' }));
    await waitFor(() => expect(exportBackup).toHaveBeenCalled());
    await waitFor(() => expect(downloadTextFile).toHaveBeenCalled());

    const backupCheckbox = within(dialog).getByLabelText('I downloaded a backup of this device.');
    await waitFor(() => expect(backupCheckbox).toBeChecked());
    expect(connectButton).toBeEnabled();

    await user.click(connectButton);
    await waitFor(() =>
      expect(syncState.current?.connectDevice).toHaveBeenCalledWith({
        confirmation: 'CONNECT',
        backupTaken: true,
      }),
    );
  });

  it('resolves a conflict with the cloud version', async () => {
    const user = userEvent.setup();
    const conflict: SyncConflict = {
      entityType: 'season',
      entityId: 'season-1',
      kind: 'update',
      localData: {
        id: 'season-1',
        name: 'Christmas 2026',
      } as SyncConflict['localData'],
      remoteData: {
        id: 'season-1',
        name: 'Christmas at Grandma’s',
      } as SyncConflict['remoteData'],
      remoteDeleted: false,
      remoteRevision: 3,
      detectedAt: '2026-10-30T10:00:00.000Z',
    };
    syncState.current = signedIn({
      conflicts: [conflict],
      link: {
        key: 'link',
        userId: 'user-1',
        email: 'alex@example.com',
        linkedAt: '2026-10-29T10:00:00.000Z',
        lastServerSeq: 4,
        lastSyncedAt: '2026-10-30T09:00:00.000Z',
        lastError: null,
      },
    });
    render(<AccountPage />);

    expect(
      screen.getByRole('heading', { name: 'Records that need a decision' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Christmas at Grandma’s')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use the cloud version' }));

    await waitFor(() =>
      expect(syncState.current?.resolve).toHaveBeenCalledWith('season', 'season-1', 'remote'),
    );
  });

  it('deletes the account only with the typed confirmation and keeps local plans', async () => {
    const user = userEvent.setup();
    syncState.current = signedIn({
      link: {
        key: 'link',
        userId: 'user-1',
        email: 'alex@example.com',
        linkedAt: '2026-10-29T10:00:00.000Z',
        lastServerSeq: 2,
        lastSyncedAt: '2026-10-30T09:00:00.000Z',
        lastError: null,
      },
    });
    render(<AccountPage />);

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete your account?' });
    const confirmButton = within(dialog).getByRole('button', { name: 'Delete account' });
    expect(confirmButton).toBeDisabled();

    await user.type(
      within(dialog).getByLabelText('Type DELETE MY ACCOUNT to confirm'),
      'DELETE MY ACCOUNT',
    );
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);

    await waitFor(() => expect(auth.deleteAccount).toHaveBeenCalledWith('DELETE MY ACCOUNT'));
    await waitFor(() => expect(syncState.current?.disconnectDevice).toHaveBeenCalled());
    expect(
      await screen.findByText(/Account deleted\. This device is disconnected/),
    ).toBeInTheDocument();
  });
});
