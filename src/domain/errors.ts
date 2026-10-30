export interface ValidationIssue {
  path: string;
  message: string;
}

interface AppErrorOptions {
  code: string;
  cause?: unknown;
  recovery?: string;
}

export class AppError extends Error {
  readonly code: string;
  readonly recovery?: string;

  constructor(message: string, options: AppErrorOptions) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.recovery = options.recovery;
  }
}

export class ValidationError extends AppError {
  readonly issues: ValidationIssue[];

  constructor(message = 'Some fields need attention.', issues: ValidationIssue[] = []) {
    super(message, { code: 'VALIDATION_ERROR' });
    this.issues = issues;
  }
}

export class NotFoundError extends AppError {
  readonly entity: string;
  readonly entityId: string;

  constructor(entity: string, entityId: string) {
    super(`${entity} was not found.`, {
      code: 'NOT_FOUND',
      recovery: 'Refresh the app. If the record is still missing, restore a backup.',
    });
    this.entity = entity;
    this.entityId = entityId;
  }
}

export class ConflictError extends AppError {
  constructor(message: string, recovery?: string) {
    super(message, { code: 'CONFLICT', recovery });
  }
}

export class StorageUnavailableError extends AppError {
  constructor(
    message = 'Local storage is unavailable in this browser. Your data has not been deleted. Check that this browser allows site storage, then reload the app.',
    options: { cause?: unknown; recovery?: string } = {},
  ) {
    super(message, {
      code: 'STORAGE_UNAVAILABLE',
      cause: options.cause,
      recovery:
        options.recovery ??
        'Your data has not been deleted. Check that this browser allows site storage, then reload the app.',
    });
  }
}

export class QuotaExceededError extends AppError {
  constructor(options: { cause?: unknown } = {}) {
    super(
      'The browser has run out of space for this planner. Download a backup, then remove old seasons or free up browser storage and try again. Your data has not been deleted.',
      {
        code: 'QUOTA_EXCEEDED',
        cause: options.cause,
        recovery:
          'Your data has not been deleted. Free up browser storage or export a backup, then try again.',
      },
    );
  }
}

export class MigrationError extends AppError {
  constructor(message: string, options: { cause?: unknown; recovery?: string } = {}) {
    super(message, {
      code: 'MIGRATION_FAILED',
      cause: options.cause,
      recovery:
        options.recovery ??
        'Your data has not been deleted. Reload the app. If the problem continues, do not clear site data; restore a backup or contact support.',
    });
  }
}

export class ImportError extends AppError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, {
      code: 'IMPORT_FAILED',
      cause: options.cause,
      recovery: 'The current data was not changed. Choose a different backup file and try again.',
    });
  }
}

export class ExportError extends AppError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, {
      code: 'EXPORT_FAILED',
      cause: options.cause,
      recovery: 'No data was changed. Try the export again.',
    });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
