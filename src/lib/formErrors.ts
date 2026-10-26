import { ValidationError, isAppError } from '../domain/errors';

export type FieldErrors = Record<string, string>;

export function fieldErrorsFrom(error: unknown): FieldErrors {
  if (!(error instanceof ValidationError)) {
    return {};
  }

  const errors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path.split('.')[0] ?? 'form';
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

export function errorMessageFrom(error: unknown, fallback: string): string {
  return isAppError(error) ? error.message : fallback;
}
