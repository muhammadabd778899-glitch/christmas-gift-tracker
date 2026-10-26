import {
  ConflictError,
  MigrationError,
  QuotaExceededError,
  StorageUnavailableError,
  isAppError,
  type AppError,
} from '../domain/errors';

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : '';
}

function findAppError(error: unknown, depth = 0): AppError | null {
  if (isAppError(error)) {
    return error;
  }

  if (!error || typeof error !== 'object' || depth > 4) {
    return null;
  }

  const candidate = error as {
    inner?: unknown;
    cause?: unknown;
    errors?: unknown[];
  };

  const nested = [candidate.inner, candidate.cause, ...(candidate.errors ?? [])];
  for (const item of nested) {
    const found = findAppError(item, depth + 1);
    if (found) {
      return found;
    }
  }

  return null;
}

export function mapStorageError(error: unknown): AppError {
  const appError = findAppError(error);
  if (appError) {
    return appError;
  }

  const name = errorName(error);

  if (name === 'QuotaExceededError') {
    return new QuotaExceededError({ cause: error });
  }

  if (name === 'VersionError') {
    return new MigrationError(
      'This local database was created by a newer version of the planner.',
      {
        cause: error,
        recovery:
          'Your data has not been deleted. Open the newer version of the planner, or update this app before trying again.',
      },
    );
  }

  if (name === 'UpgradeError' || name === 'SchemaError') {
    return new MigrationError('The local database could not be upgraded safely.', {
      cause: error,
    });
  }

  if (name === 'ConstraintError') {
    return new ConflictError(
      'A record with that identifier already exists.',
      'Refresh the app and try again without duplicating the record.',
    );
  }

  if (
    name === 'DatabaseClosedError' ||
    name === 'OpenFailedError' ||
    name === 'InvalidStateError' ||
    name === 'UnknownError' ||
    name === 'AbortError' ||
    name === 'NotSupportedError'
  ) {
    return new StorageUnavailableError('The local database could not be opened.', {
      cause: error,
    });
  }

  return new StorageUnavailableError('The local database could not complete that request.', {
    cause: error,
  });
}

export async function withStorageErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapStorageError(error);
  }
}

export function toAppError(error: unknown): AppError {
  return mapStorageError(error);
}
