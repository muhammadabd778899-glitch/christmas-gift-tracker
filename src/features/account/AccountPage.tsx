import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Check,
  Cloud,
  CloudOff,
  Download,
  KeyRound,
  Link2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Unlink,
} from 'lucide-react';
import { useOnlineSync, type OnlineSyncContextValue } from '../../app/online/onlineSyncContext';
import { useRepositories } from '../../app/providers/storageContext';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import type { AppError } from '../../domain/errors';
import { CONNECT_CONFIRMATION, type ConnectionPlan } from '../../sync/connect';
import {
  DELETE_ACCOUNT_CONFIRMATION,
  deleteAccount,
  exportAccountData,
  sendPasswordReset,
  signInWithEmail,
  signOutAccount,
  signUpWithEmail,
  updatePassword,
  type AccountUser,
} from '../../sync/supabase/auth';
import type { ConflictChoice } from '../../sync/conflicts';
import { downloadTextFile } from '../../lib/download';
import { errorMessageFrom } from '../../lib/formErrors';
import {
  entityDisplayName,
  entityTypeLabel,
  type SyncConflict,
  type SyncGlobalState,
  type SyncLink,
  type SyncStatusSnapshot,
} from '../../storage/syncTypes';
import styles from './AccountPage.module.css';

type Message = { kind: 'error' | 'success'; text: string; recovery?: string };

function messageFrom(error: unknown, fallback: string): Message {
  const appError = error as AppError;
  return {
    kind: 'error',
    text: errorMessageFrom(error, fallback),
    recovery: appError.recovery,
  };
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return 'Not yet';
  }

  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function recoveryRequested(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (hash.get('type') === 'recovery') {
    return true;
  }

  return new URLSearchParams(window.location.search).get('type') === 'recovery';
}

const statusMeta: Record<SyncGlobalState, { label: string; tone: BadgeTone }> = {
  local: { label: 'Not connected', tone: 'neutral' },
  'signed-out': { label: 'Signed out', tone: 'neutral' },
  idle: { label: 'Ready to sync', tone: 'neutral' },
  offline: { label: 'Offline', tone: 'gold' },
  syncing: { label: 'Syncing', tone: 'gold' },
  synced: { label: 'Synced', tone: 'success' },
  pending: { label: 'Waiting to sync', tone: 'gold' },
  conflict: { label: 'Needs a decision', tone: 'burgundy' },
  error: { label: 'Needs attention', tone: 'burgundy' },
};

function StatusMessage({ message }: { message: Message | null }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={message.kind === 'error' ? styles.errorMessage : styles.successMessage}
      role={message.kind === 'error' ? 'alert' : 'status'}
    >
      <strong>{message.text}</strong>
      {message.recovery ? <span>{message.recovery}</span> : null}
    </div>
  );
}

function ErrorBanner({ error, onDismiss }: { error: AppError; onDismiss: () => void }) {
  return (
    <div className={styles.banner} role="alert">
      <TriangleAlert size={18} aria-hidden="true" />
      <div>
        <strong>{error.message}</strong>
        {error.recovery ? <span>{error.recovery}</span> : null}
      </div>
      <Button variant="ghost" size="sm" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  );
}

function AuthPanel({
  sync,
  onNotice,
}: {
  sync: OnlineSyncContextValue;
  onNotice: (text: string) => void;
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const result = await signUpWithEmail(email, password);
        if (result.needsEmailConfirmation) {
          onNotice(
            'Account created. Check your email to confirm the address, then come back and sign in.',
          );
        } else {
          onNotice('Account created. This device is not connected to it yet.');
        }
      } else {
        await signInWithEmail(email, password);
        onNotice('Signed in. Connect this device to start syncing.');
      }

      setEmail('');
      setPassword('');
      await sync.reloadSession();
    } catch (error) {
      setMessage(messageFrom(error, 'The account request could not be completed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <Badge tone="evergreen">
          <Cloud size={12} aria-hidden="true" />
          Online edition
        </Badge>
        <CardTitle as="h2">
          {mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
        </CardTitle>
        <CardDescription>
          An account is optional. It stores a copy of this planner so you can open it on another
          device. The offline edition keeps everything in this browser only.
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.body}>
        <div className={styles.segmented} role="group" aria-label="Account action">
          <button
            type="button"
            className={mode === 'signin' ? styles.segmentActive : styles.segment}
            aria-pressed={mode === 'signin'}
            onClick={() => {
              setMode('signin');
              setMessage(null);
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'signup' ? styles.segmentActive : styles.segment}
            aria-pressed={mode === 'signup'}
            onClick={() => {
              setMode('signup');
              setMessage(null);
            }}
          >
            Create account
          </button>
        </div>

        <form
          className={styles.form}
          aria-label={mode === 'signin' ? 'Sign in form' : 'Create account form'}
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            hint={mode === 'signup' ? 'Use at least 8 characters.' : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <StatusMessage message={message} />

          <div className={styles.formActions}>
            <Button type="submit" disabled={busy}>
              {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
            {mode === 'signin' ? (
              <Button variant="ghost" onClick={() => setResetOpen(true)}>
                <KeyRound size={16} aria-hidden="true" />
                Forgot password?
              </Button>
            ) : null}
          </div>

          {!sync.online ? (
            <p className={styles.hint}>
              You are offline. Signing in and syncing need a connection; local plans still work.
            </p>
          ) : null}
        </form>
      </CardContent>

      {resetOpen ? (
        <ResetPasswordDialog
          initialEmail={email}
          onClose={() => setResetOpen(false)}
          onSent={() => {
            setResetOpen(false);
            onNotice('If an account exists for that address, a reset link is on its way.');
          }}
        />
      ) : null}
    </Card>
  );
}

function ResetPasswordDialog({
  initialEmail,
  onClose,
  onSent,
}: {
  initialEmail: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      await sendPasswordReset(email);
      onSent();
    } catch (error) {
      setMessage(messageFrom(error, 'The reset email could not be sent.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Reset your password"
      description="We will email a reset link to the address on your account."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="reset-password-form" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
        </>
      }
    >
      <form
        id="reset-password-form"
        className={styles.form}
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <StatusMessage message={message} />
      </form>
    </Dialog>
  );
}

function RecoveryCard({ sync, onDone }: { sync: OnlineSyncContextValue; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password !== confirmation) {
      setMessage({ kind: 'error', text: 'The passwords do not match.' });
      return;
    }

    setBusy(true);

    try {
      await updatePassword(password);
      setPassword('');
      setConfirmation('');
      setMessage({ kind: 'success', text: 'Password updated. You can keep setting up sync.' });
      await sync.reloadSession();
      onDone();
    } catch (error) {
      setMessage(messageFrom(error, 'The password could not be updated.'));
    } finally {
      setBusy(false);
    }
  }

  if (!sync.user) {
    return (
      <Card>
        <CardHeader>
          <Badge tone="gold">
            <KeyRound size={12} aria-hidden="true" />
            Password reset
          </Badge>
          <CardTitle as="h2">Open the recovery link from your email</CardTitle>
          <CardDescription>
            This page cannot finish the reset without a valid recovery link. Open the newest link
            from the reset email on this device, then choose a new password here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" onClick={onDone}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Badge tone="gold">
          <KeyRound size={12} aria-hidden="true" />
          Password reset
        </Badge>
        <CardTitle as="h2">Choose a new password</CardTitle>
        <CardDescription>
          You are signed in with a recovery link. Set a new password to finish.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="Use at least 8 characters."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
          />
          <StatusMessage message={message} />
          <div className={styles.formActions}>
            <Button type="submit" disabled={busy}>
              {busy ? 'Updating…' : 'Update password'}
            </Button>
            <Button variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ConnectCard({ sync }: { sync: OnlineSyncContextValue }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  return (
    <Card>
      <CardHeader>
        <Badge tone="neutral">
          <Link2 size={12} aria-hidden="true" />
          Not connected
        </Badge>
        <CardTitle as="h2">Connect this device</CardTitle>
        <CardDescription>
          Your account exists, but this browser is not linked to it yet. Connecting compares this
          device with the account before anything is uploaded.
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.body}>
        <ul className={styles.checkList}>
          <li>An empty account receives this device’s planner.</li>
          <li>An empty device downloads the account’s planner.</li>
          <li>
            When both have records they are combined. Nothing is deleted or overwritten — differing
            records wait for your decision.
          </li>
        </ul>
        <StatusMessage message={message} />
        <div className={styles.actions}>
          <Button onClick={() => setOpen(true)}>
            <Link2 size={16} aria-hidden="true" />
            Connect this device
          </Button>
        </div>
      </CardContent>

      {open ? (
        <ConnectDialog
          sync={sync}
          onClose={() => setOpen(false)}
          onConnected={(summary) => {
            setOpen(false);
            setMessage({
              kind: 'success',
              text: `Connected. ${summary.pushed} sent, ${summary.pulled} received, ${summary.conflicts} waiting for a decision.`,
            });
          }}
        />
      ) : null}
    </Card>
  );
}

function modeCopy(mode: ConnectionPlan['mode']): string {
  switch (mode) {
    case 'upload':
      return 'Your account is empty, so this device’s planner will be uploaded to it.';
    case 'download':
      return 'This device has no planner records, so the account’s planner will be downloaded here.';
    case 'merge':
      return 'Both this device and the account have records. They will be combined. Nothing is deleted or overwritten, and differing records stay listed for you to decide.';
  }
}

function ConnectDialog({
  sync,
  onClose,
  onConnected,
}: {
  sync: OnlineSyncContextValue;
  onClose: () => void;
  onConnected: (summary: { pushed: number; pulled: number; conflicts: number }) => void;
}) {
  const repositories = useRepositories();
  const [plan, setPlan] = useState<ConnectionPlan | null>(null);
  const [loadError, setLoadError] = useState<Message | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const result = await sync.planConnection();
        if (!cancelled) {
          setPlan(result);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(messageFrom(error, 'The connection plan could not be prepared.'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sync]);

  async function downloadBackup() {
    setExporting(true);
    setMessage(null);

    try {
      const backup = await repositories.data.exportBackup();
      downloadTextFile(backup.filename, backup.content, 'application/json');
      setBackupDownloaded(true);
    } catch (error) {
      setMessage(messageFrom(error, 'The backup could not be downloaded. Nothing was changed.'));
    } finally {
      setExporting(false);
    }
  }

  async function handleConnect() {
    if (!plan) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const result = await sync.connectDevice({
        confirmation,
        backupTaken: plan.mode === 'merge' ? backupDownloaded : true,
      });
      onConnected(result.summary);
    } catch (error) {
      setMessage(messageFrom(error, 'This device could not be connected.'));
    } finally {
      setBusy(false);
    }
  }

  const mergeNeedsBackup = plan?.mode === 'merge' && !backupDownloaded;
  const canConnect =
    plan !== null &&
    confirmation.trim() === CONNECT_CONFIRMATION &&
    !mergeNeedsBackup &&
    !busy &&
    message?.kind !== 'error';

  return (
    <Dialog
      open
      onClose={onClose}
      title="Connect this device"
      description="Review what will happen before anything is sent."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleConnect()} disabled={!canConnect}>
            {busy ? 'Connecting…' : 'Connect'}
          </Button>
        </>
      }
    >
      <div className={styles.dialogBody}>
        {loadError ? (
          <StatusMessage message={loadError} />
        ) : plan ? (
          <>
            <p className={styles.planCopy}>{modeCopy(plan.mode)}</p>

            <dl className={styles.planGrid}>
              <div>
                <dt>This device</dt>
                <dd>{plan.localRecords} records</dd>
              </div>
              <div>
                <dt>Cloud account</dt>
                <dd>{plan.cloudRecords} records</dd>
              </div>
              <div>
                <dt>Already identical</dt>
                <dd>{plan.identical}</dd>
              </div>
              <div>
                <dt>Only on this device</dt>
                <dd>{plan.localOnly}</dd>
              </div>
              <div>
                <dt>Only in the account</dt>
                <dd>{plan.cloudOnly}</dd>
              </div>
              <div>
                <dt>Need a decision</dt>
                <dd>{plan.conflicts}</dd>
              </div>
            </dl>

            {plan.mode === 'merge' ? (
              <div className={styles.backupBlock}>
                <p>
                  Download a fresh backup first. Merging cannot be undone if you later choose the
                  wrong copy for a record.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => void downloadBackup()}
                  disabled={exporting}
                >
                  <Download size={16} aria-hidden="true" />
                  {exporting ? 'Preparing backup…' : 'Download backup'}
                </Button>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={backupDownloaded}
                    onChange={(event) => setBackupDownloaded(event.target.checked)}
                  />
                  <span>I downloaded a backup of this device.</span>
                </label>
              </div>
            ) : null}

            <Input
              label={`Type ${CONNECT_CONFIRMATION} to confirm`}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              hint="This prevents an accidental connection."
            />

            <StatusMessage message={message} />

            {!sync.online ? (
              <p className={styles.hint}>
                You are offline. Reconnect to the internet to complete the connection.
              </p>
            ) : null}
          </>
        ) : (
          <p className={styles.hint} role="status">
            Checking this device and the account…
          </p>
        )}
      </div>
    </Dialog>
  );
}

function SyncStatusCard({ sync, link }: { sync: OnlineSyncContextValue; link: SyncLink }) {
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const status: SyncStatusSnapshot | null = sync.status;
  const state = sync.syncing ? 'syncing' : (status?.state ?? 'idle');
  const meta = statusMeta[state];

  return (
    <Card>
      <CardHeader>
        <div className={styles.titleRow}>
          <Badge tone={meta.tone}>{sync.syncing ? 'Syncing…' : meta.label}</Badge>
          <span className={styles.linkEmail}>
            <Cloud size={14} aria-hidden="true" />
            {link.email ?? 'Account connected'}
          </span>
        </div>
        <CardTitle as="h2">Cloud sync</CardTitle>
        <CardDescription>
          Changes on this device sync automatically while you are signed in and online.
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.body}>
        <dl className={styles.statusGrid}>
          <div>
            <dt>Last synced</dt>
            <dd>{formatTimestamp(link.lastSyncedAt)}</dd>
          </div>
          <div>
            <dt>Waiting to send</dt>
            <dd>{status?.pendingCount ?? 0}</dd>
          </div>
          <div>
            <dt>Needs a decision</dt>
            <dd>{status?.conflictCount ?? 0}</dd>
          </div>
        </dl>

        {status?.message ? <p className={styles.hint}>{status.message}</p> : null}
        {link.lastError ? (
          <p className={styles.warning} role="alert">
            {link.lastError}
          </p>
        ) : null}
        {!sync.online ? (
          <p className={styles.hint}>
            You are offline. Changes are saved on this device and sync when the connection returns.
          </p>
        ) : null}

        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() => void sync.syncNow()}
            disabled={!sync.online || sync.syncing}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {sync.syncing ? 'Syncing…' : 'Sync now'}
          </Button>
          <Button variant="ghost" onClick={() => setDisconnectOpen(true)}>
            <Unlink size={16} aria-hidden="true" />
            Disconnect this device
          </Button>
        </div>
      </CardContent>

      {disconnectOpen ? (
        <DisconnectDialog
          onClose={() => setDisconnectOpen(false)}
          onConfirm={async () => {
            await sync.disconnectDevice();
            setDisconnectOpen(false);
          }}
        />
      ) : null}
    </Card>
  );
}

function DisconnectDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function confirm() {
    setBusy(true);
    setMessage(null);

    try {
      await onConfirm();
    } catch (error) {
      setMessage(messageFrom(error, 'This device could not be disconnected.'));
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Disconnect this device?"
      description="Your local planner stays on this device."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void confirm()} disabled={busy}>
            {busy ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </>
      }
    >
      <div className={styles.dialogBody}>
        <p>
          Disconnecting stops automatic sync and clears this device’s sync history. Your seasons,
          recipients, gifts, and ideas remain here.
        </p>
        <p>
          Changes that have not reached the account yet also stay on this device. Reconnecting later
          compares them with the account instead of discarding anything.
        </p>
        <StatusMessage message={message} />
      </div>
    </Dialog>
  );
}

function ConflictCard({
  sync,
  conflict,
}: {
  sync: OnlineSyncContextValue;
  conflict: SyncConflict;
}) {
  const [busy, setBusy] = useState<ConflictChoice | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const localName = entityDisplayName(conflict.entityType, conflict.localData);
  const remoteName = entityDisplayName(conflict.entityType, conflict.remoteData);
  const key = `${conflict.entityType}:${conflict.entityId}`;

  async function choose(choice: ConflictChoice) {
    setBusy(choice);
    setMessage(null);

    try {
      await sync.resolve(conflict.entityType, conflict.entityId, choice);
    } catch (error) {
      setMessage(messageFrom(error, 'The conflict could not be resolved.'));
      setBusy(null);
    }
  }

  return (
    <Card key={key} className={styles.conflictCard}>
      <CardHeader>
        <div className={styles.titleRow}>
          <Badge tone="burgundy">{entityTypeLabel(conflict.entityType)}</Badge>
          <span className={styles.detected}>Found {formatTimestamp(conflict.detectedAt)}</span>
        </div>
        <CardTitle as="h3">{localName}</CardTitle>
        <CardDescription>
          This record changed in two places. Nothing was overwritten — choose which version to keep.
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.body}>
        <dl className={styles.compareGrid}>
          <div>
            <dt>This device</dt>
            <dd>{conflict.localData ? localName : 'Deleted on this device'}</dd>
          </div>
          <div>
            <dt>Cloud account</dt>
            <dd>{conflict.remoteDeleted ? 'Deleted in the account' : remoteName}</dd>
          </div>
        </dl>

        <StatusMessage message={message} />

        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() => void choose('local')}
            disabled={busy !== null || !conflict.localData}
          >
            <Check size={16} aria-hidden="true" />
            {busy === 'local' ? 'Keeping…' : 'Keep this device’s version'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void choose('remote')}
            disabled={busy !== null}
          >
            <Cloud size={16} aria-hidden="true" />
            {busy === 'remote'
              ? 'Applying…'
              : conflict.remoteDeleted
                ? 'Accept the cloud deletion'
                : 'Use the cloud version'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password !== confirmation) {
      setMessage({ kind: 'error', text: 'The passwords do not match.' });
      return;
    }

    setBusy(true);

    try {
      await updatePassword(password);
      setPassword('');
      setConfirmation('');
      setMessage({ kind: 'success', text: 'Password updated.' });
    } catch (error) {
      setMessage(messageFrom(error, 'The password could not be updated.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <Badge tone="neutral">
          <KeyRound size={12} aria-hidden="true" />
          Security
        </Badge>
        <CardTitle as="h2">Password</CardTitle>
        <CardDescription>Choose a new password for this account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="Use at least 8 characters."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
          />
          <StatusMessage message={message} />
          <div className={styles.actions}>
            <Button type="submit" disabled={busy}>
              {busy ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AccountDataCard({
  onNotice,
  onSignOut,
  onDelete,
}: {
  onNotice: (text: string) => void;
  onSignOut: () => void;
  onDelete: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function exportData() {
    setBusy(true);
    setMessage(null);

    try {
      const content = await exportAccountData();
      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile(`gift-tracker-account-${date}.json`, content, 'application/json');
      onNotice('A copy of the records stored in your account was downloaded.');
    } catch (error) {
      setMessage(messageFrom(error, 'Your account data could not be exported.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <Badge tone="neutral">
          <ShieldCheck size={12} aria-hidden="true" />
          Your data
        </Badge>
        <CardTitle as="h2">Export, sign out, or delete</CardTitle>
        <CardDescription>
          These actions affect the account only. The planner stored in this browser is separate.
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.body}>
        <div className={styles.actionRows}>
          <div className={styles.actionRow}>
            <div>
              <strong>Export account data</strong>
              <span>
                Download the records stored in your account. Local edits that have not synced yet
                are not included.
              </span>
            </div>
            <Button variant="secondary" onClick={() => void exportData()} disabled={busy}>
              <Download size={16} aria-hidden="true" />
              {busy ? 'Preparing…' : 'Export'}
            </Button>
          </div>
          <div className={styles.actionRow}>
            <div>
              <strong>Sign out</strong>
              <span>
                Stops automatic sync in this browser. This device stays linked, and your local
                planner is unchanged.
              </span>
            </div>
            <Button variant="secondary" onClick={onSignOut}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </Button>
          </div>
          <div className={styles.actionRow}>
            <div>
              <strong>Delete account</strong>
              <span>
                Permanently removes the account and its cloud records. The planner on this device
                stays unless you clear it separately.
              </span>
            </div>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={16} aria-hidden="true" />
              Delete account
            </Button>
          </div>
        </div>

        <StatusMessage message={message} />

        {deleteOpen ? (
          <DeleteAccountDialog
            onClose={() => setDeleteOpen(false)}
            onDeleted={() => {
              setDeleteOpen(false);
              onDelete();
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function DeleteAccountDialog({
  onClose,
  onDeleted,
}: {
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function handleDelete() {
    setBusy(true);
    setMessage(null);

    try {
      await deleteAccount(confirmation);
      onDeleted();
    } catch (error) {
      setMessage(messageFrom(error, 'The account could not be deleted.'));
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Delete your account?"
      description="This removes the account and every cloud record in it."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void handleDelete()}
            disabled={busy || confirmation.trim() !== DELETE_ACCOUNT_CONFIRMATION}
          >
            {busy ? 'Deleting…' : 'Delete account'}
          </Button>
        </>
      }
    >
      <div className={styles.dialogBody}>
        <p>
          The planner stored in this browser is kept. Only the account and its cloud records are
          deleted.
        </p>
        <p>
          Export a copy first if you might need the cloud records later. Download a local backup
          from Settings to keep this device’s planner.
        </p>
        <Input
          label={`Type ${DELETE_ACCOUNT_CONFIRMATION} to confirm`}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
        />
        <StatusMessage message={message} />
      </div>
    </Dialog>
  );
}

function SignedInPanel({
  sync,
  user,
  link,
  onNotice,
}: {
  sync: OnlineSyncContextValue;
  user: AccountUser;
  link: SyncLink | null;
  onNotice: (text: string) => void;
}) {
  const [signOutMessage, setSignOutMessage] = useState<Message | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const differentAccount = link !== null && link.userId !== user.id;

  async function signOut() {
    setSignOutMessage(null);

    try {
      await signOutAccount();
      await sync.reloadSession();
      onNotice(
        'Signed out. Automatic sync stopped; this device stays linked and keeps your local planner.',
      );
    } catch (error) {
      setSignOutMessage(messageFrom(error, 'The sign-out did not complete.'));
    }
  }

  async function finishAccountDeletion() {
    await sync.disconnectDevice();
    await sync.reloadSession();
    onNotice('Account deleted. This device is disconnected and your local planner is unchanged.');
  }

  return (
    <>
      {differentAccount ? (
        <Card className={styles.warningCard}>
          <CardHeader>
            <Badge tone="burgundy">
              <CloudOff size={12} aria-hidden="true" />
              Different account
            </Badge>
            <CardTitle as="h2">This device is linked to another account</CardTitle>
            <CardDescription>
              This browser syncs with {link.email ?? 'a different account'}. Disconnect it before
              connecting {user.email ?? 'this account'} so the two planners are never mixed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="danger" onClick={() => setDisconnectOpen(true)}>
              <Unlink size={16} aria-hidden="true" />
              Disconnect this device
            </Button>
            {disconnectOpen ? (
              <DisconnectDialog
                onClose={() => setDisconnectOpen(false)}
                onConfirm={async () => {
                  await sync.disconnectDevice();
                  setDisconnectOpen(false);
                }}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : link ? (
        <SyncStatusCard sync={sync} link={link} />
      ) : (
        <ConnectCard sync={sync} />
      )}

      {sync.conflicts.length > 0 ? (
        <section className={styles.conflictSection} aria-labelledby="conflicts-heading">
          <div className={styles.sectionHeading}>
            <h2 id="conflicts-heading">Records that need a decision</h2>
            <p>
              These records changed here and in the account. Your local copy is still intact; pick
              one version for each record.
            </p>
          </div>
          <div className={styles.conflictList}>
            {sync.conflicts.map((conflict) => (
              <ConflictCard
                key={`${conflict.entityType}:${conflict.entityId}`}
                sync={sync}
                conflict={conflict}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className={styles.twoColumn}>
        <PasswordCard />
        <AccountDataCard
          onNotice={onNotice}
          onSignOut={() => void signOut()}
          onDelete={() => void finishAccountDeletion()}
        />
      </div>

      {signOutMessage ? <StatusMessage message={signOutMessage} /> : null}
    </>
  );
}

function AccountScreen({ sync }: { sync: OnlineSyncContextValue }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(recoveryRequested);

  function finishRecovery() {
    setRecovery(false);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  const badge: ReactNode = sync.link ? (
    <Badge tone="evergreen">Connected</Badge>
  ) : (
    <Badge tone="neutral">Not connected</Badge>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Online edition"
        title="Account"
        description="Sign in to keep a copy of this planner in the cloud and sync it across devices. The offline edition never needs an account."
        badge={badge}
      />

      {sync.error ? <ErrorBanner error={sync.error} onDismiss={sync.clearError} /> : null}

      {notice ? (
        <div className={styles.notice} role="status">
          <Check size={16} aria-hidden="true" />
          <span>{notice}</span>
          <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      {!sync.ready ? (
        <Card>
          <CardContent>
            <p className={styles.hint} role="status">
              Checking your account…
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {recovery ? <RecoveryCard sync={sync} onDone={finishRecovery} /> : null}

          {sync.user ? (
            <SignedInPanel
              sync={sync}
              user={sync.user}
              link={sync.link}
              onNotice={(text) => setNotice(text)}
            />
          ) : recovery ? null : (
            <AuthPanel sync={sync} onNotice={(text) => setNotice(text)} />
          )}

          <p className={styles.footnote}>
            Your password is handled by Supabase authentication. This app never stores it. Only the
            public anonymous key is included in the online edition.
          </p>
        </>
      )}
    </div>
  );
}

export default function AccountPage() {
  const sync = useOnlineSync();

  if (!sync) {
    return (
      <ErrorState
        title="Account settings are unavailable"
        description="This build is the offline edition, which does not include accounts or cloud sync. Use the online edition to connect an account."
      />
    );
  }

  return <AccountScreen sync={sync} />;
}
