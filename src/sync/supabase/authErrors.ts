import { AuthError, type AppError } from '../../domain/errors';

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}

const KNOWN_MESSAGES: Array<{ match: RegExp; error: () => AuthError }> = [
  {
    match: /invalid login credentials/i,
    error: () =>
      new AuthError('That email and password do not match an account.', {
        recovery: 'Check both fields, or use “Forgot password?” to reset it.',
      }),
  },
  {
    match: /email not confirmed/i,
    error: () =>
      new AuthError('This email address has not been confirmed yet.', {
        recovery: 'Open the confirmation email from your inbox, then sign in again.',
      }),
  },
  {
    match: /user already registered|already been registered/i,
    error: () =>
      new AuthError('An account already exists for this email address.', {
        recovery: 'Sign in instead, or use “Forgot password?” if you cannot remember the password.',
      }),
  },
  {
    match: /password should be at least|weak password/i,
    error: () =>
      new AuthError('That password is too short.', {
        recovery:
          'Use at least 8 characters. A longer phrase is easier to remember and harder to guess.',
      }),
  },
  {
    match: /rate limit|too many requests|after \d+ seconds/i,
    error: () =>
      new AuthError('Too many attempts. Please wait a moment before trying again.', {
        recovery: 'Wait a minute, then try again. Your local plans are unchanged.',
      }),
  },
  {
    match: /failed to fetch|network|fetch failed|load failed/i,
    error: () =>
      new AuthError('The account service could not be reached.', {
        recovery: 'Check your connection and try again. You can keep working offline.',
      }),
  },
  {
    match: /jwt expired|session.*expired|refresh token/i,
    error: () =>
      new AuthError('Your session has expired.', {
        recovery: 'Sign in again. Your local plans are unchanged.',
      }),
  },
];

export function toAuthError(error: unknown): AppError {
  if (error instanceof AuthError) {
    return error;
  }

  const message = messageOf(error);
  const known = KNOWN_MESSAGES.find((candidate) => candidate.match.test(message));

  if (known) {
    return known.error();
  }

  return new AuthError('The account request could not be completed.', {
    cause: error,
    recovery:
      'Try again. If the problem continues, sign out and back in. Your local plans are unchanged.',
  });
}
