import { describe, expect, it } from 'vitest';
import {
  AppError,
  ConflictError,
  MigrationError,
  QuotaExceededError,
  StorageUnavailableError,
  ValidationError,
} from '../domain/errors';
import { mapStorageError, toAppError, withStorageErrors } from './errors';

function namedError(name: string, message = 'fake failure'): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe('storage error mapping', () => {
  it('preserves typed application errors', () => {
    const validation = new ValidationError('Invalid.', [{ path: 'name', message: 'Required.' }]);
    expect(mapStorageError(validation)).toBe(validation);
    expect(toAppError(validation)).toBe(validation);
  });

  it('maps quota, version, upgrade, constraint, and open failures', () => {
    expect(mapStorageError(namedError('QuotaExceededError'))).toBeInstanceOf(QuotaExceededError);
    expect(mapStorageError(namedError('VersionError'))).toBeInstanceOf(MigrationError);
    expect(mapStorageError(namedError('UpgradeError'))).toBeInstanceOf(MigrationError);
    expect(mapStorageError(namedError('ConstraintError'))).toBeInstanceOf(ConflictError);
    expect(mapStorageError(namedError('OpenFailedError'))).toBeInstanceOf(StorageUnavailableError);
    expect(mapStorageError(namedError('InvalidStateError'))).toBeInstanceOf(
      StorageUnavailableError,
    );
  });

  it('finds a typed error wrapped by a transaction or Dexie error', () => {
    const wrapped = Object.assign(new Error('wrapped'), {
      inner: new ValidationError('Original validation.'),
    });

    expect(mapStorageError(wrapped)).toBeInstanceOf(ValidationError);
  });

  it('maps unknown failures to a typed storage error', () => {
    const mapped = mapStorageError(new Error('unknown'));
    expect(mapped).toBeInstanceOf(StorageUnavailableError);
    expect(mapped.code).toBe('STORAGE_UNAVAILABLE');
    expect(mapped.recovery).toBeTruthy();
  });

  it('wraps asynchronous storage failures', async () => {
    await expect(
      withStorageErrors(async () => {
        throw namedError('QuotaExceededError');
      }),
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });

  it('exposes recovery guidance on storage errors', () => {
    const error = mapStorageError(namedError('QuotaExceededError')) as AppError;
    expect(error.recovery).toContain('data has not been deleted');
  });
});
