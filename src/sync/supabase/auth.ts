import type { User } from '@supabase/supabase-js';
import { AuthError, SyncError, ValidationError } from '../../domain/errors';
import { toAuthError } from './authErrors';
import { getSupabaseClient } from './client';

export const DELETE_ACCOUNT_CONFIRMATION = 'DELETE MY ACCOUNT';

const MIN_PASSWORD_LENGTH = 8;

export interface AccountUser {
  id: string;
  email: string | null;
}

export interface SignUpResult {
  user: AccountUser;
  needsEmailConfirmation: boolean;
}

function toAccountUser(user: User): AccountUser {
  return { id: user.id, email: user.email ?? null };
}

function assertEmail(email: string): string {
  const trimmed = email.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new ValidationError('Enter a valid email address.', [
      { path: 'email', message: 'The email address is not complete.' },
    ]);
  }

  return trimmed;
}

function assertPassword(password: string): string {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`, [
      {
        path: 'password',
        message: `The password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      },
    ]);
  }

  return password;
}

export async function getCurrentUser(): Promise<AccountUser | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();

  if (error) {
    if (error.message.toLowerCase().includes('session')) {
      return null;
    }
    throw toAuthError(error);
  }

  return data.user ? toAccountUser(data.user) : null;
}

export async function signUpWithEmail(email: string, password: string): Promise<SignUpResult> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email: assertEmail(email),
    password: assertPassword(password),
  });

  if (error) {
    throw toAuthError(error);
  }

  if (!data.user) {
    throw new AuthError('The account could not be created.', {
      recovery: 'Try again. If the problem continues, use a different email address.',
    });
  }

  return { user: toAccountUser(data.user), needsEmailConfirmation: data.session === null };
}

export async function signInWithEmail(email: string, password: string): Promise<AccountUser> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: assertEmail(email),
    password: assertPassword(password),
  });

  if (error) {
    throw toAuthError(error);
  }

  if (!data.user) {
    throw new AuthError('The sign-in did not complete.', {
      recovery: 'Try again. Your local plans are unchanged.',
    });
  }

  return toAccountUser(data.user);
}

export async function signOutAccount(): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw toAuthError(error);
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  const client = getSupabaseClient();
  const redirectTo =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}${window.location.pathname}`;
  const { error } = await client.auth.resetPasswordForEmail(assertEmail(email), {
    redirectTo,
  });

  if (error) {
    throw toAuthError(error);
  }
}

export async function updatePassword(password: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.auth.updateUser({ password: assertPassword(password) });

  if (error) {
    throw toAuthError(error);
  }
}

export async function exportAccountData(): Promise<string> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('export_my_account');

  if (error) {
    throw new SyncError('Your account data could not be exported.', {
      cause: error,
      recovery: 'Try again. Your local plans and cloud data are unchanged.',
    });
  }

  return `${JSON.stringify(data, null, 2)}\n`;
}

export async function deleteAccount(confirmation: string): Promise<void> {
  if (confirmation.trim() !== DELETE_ACCOUNT_CONFIRMATION) {
    throw new ValidationError(`Type ${DELETE_ACCOUNT_CONFIRMATION} to delete your account.`, [
      {
        path: 'confirmation',
        message: `The deletion confirmation must be exactly ${DELETE_ACCOUNT_CONFIRMATION}.`,
      },
    ]);
  }

  const client = getSupabaseClient();
  const { error } = await client.rpc('delete_my_account');

  if (error) {
    throw new SyncError('Your account could not be deleted.', {
      cause: error,
      recovery: 'Try again. Nothing was changed here, and your local plans are unchanged.',
    });
  }

  await client.auth.signOut({ scope: 'local' });
}
