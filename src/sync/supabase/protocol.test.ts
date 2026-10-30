import { describe, expect, it } from 'vitest';
import { AuthError, SyncError, isAppError } from '../../domain/errors';
import { toAuthError } from './authErrors';
import { mapCloudRow, mapCloudRows, mapCount, mapWriteResult } from './protocol';

const baseRow = {
  entity_type: 'season',
  entity_id: '11111111-1111-4111-8111-111111111111',
  revision: 3,
  server_seq: 42,
  deleted_at: null,
  updated_at: '2026-11-01T10:00:00+00:00',
  data: { id: '11111111-1111-4111-8111-111111111111', name: 'Christmas' },
};

describe('cloud protocol mapping', () => {
  it('maps a live row', () => {
    expect(mapCloudRow(baseRow)).toEqual({
      entityType: 'season',
      entityId: baseRow.entity_id,
      revision: 3,
      seq: 42,
      deleted: false,
      updatedAt: '2026-11-01T10:00:00+00:00',
      data: baseRow.data,
    });
  });

  it('maps a tombstone', () => {
    const row = {
      ...baseRow,
      deleted_at: '2026-11-02T10:00:00+00:00',
      data: null,
    };

    expect(mapCloudRow(row)).toMatchObject({ deleted: true, data: null });
  });

  it('rejects unknown record types and malformed rows', () => {
    expect(() => mapCloudRow({ ...baseRow, entity_type: 'password' })).toThrow(SyncError);
    expect(() => mapCloudRow({ ...baseRow, revision: 'three' })).toThrow(SyncError);
    expect(() => mapCloudRow(null)).toThrow(SyncError);
    expect(() => mapCloudRows({ rows: [] })).toThrow(SyncError);
  });

  it('maps applied and conflicting write results', () => {
    expect(mapWriteResult({ status: 'applied', revision: 4, seq: 50 })).toEqual({
      status: 'applied',
      revision: 4,
      seq: 50,
    });

    expect(mapWriteResult({ status: 'conflict', remote: baseRow })).toMatchObject({
      status: 'conflict',
      remote: { revision: 3 },
    });

    expect(mapWriteResult({ status: 'conflict', remote: null })).toEqual({
      status: 'conflict',
      remote: null,
    });

    expect(() => mapWriteResult({ status: 'applied' })).toThrow(SyncError);
    expect(() => mapWriteResult({ status: 'unknown' })).toThrow(SyncError);
  });

  it('maps record counts from numbers or numeric strings', () => {
    expect(mapCount(12)).toBe(12);
    expect(mapCount('12')).toBe(12);
    expect(() => mapCount('twelve')).toThrow(SyncError);
    expect(() => mapCount(null)).toThrow(SyncError);
  });
});

describe('account error mapping', () => {
  it('maps known authentication failures to safe, actionable messages', () => {
    const credentials = toAuthError({ message: 'Invalid login credentials' });
    expect(credentials).toBeInstanceOf(AuthError);
    expect(credentials.message).toContain('do not match an account');

    expect(toAuthError({ message: 'Email not confirmed' }).recovery).toContain(
      'confirmation email',
    );
    expect(toAuthError({ message: 'User already registered' }).message).toContain('already exists');
    expect(toAuthError({ message: 'Password should be at least 6 characters' }).recovery).toContain(
      'at least 8 characters',
    );
    expect(toAuthError({ message: 'Email rate limit exceeded' }).message).toContain(
      'Too many attempts',
    );
    expect(toAuthError({ message: 'Failed to fetch' }).message).toContain('could not be reached');
    expect(toAuthError({ message: 'JWT expired' }).message).toContain('session has expired');
  });

  it('falls back to a generic error without exposing the raw cause', () => {
    const error = toAuthError({ message: 'Database error saving new user' });

    expect(isAppError(error)).toBe(true);
    expect(error.message).toBe('The account request could not be completed.');
    expect(error.message).not.toContain('Database');
  });

  it('leaves its own errors untouched', () => {
    const original = new AuthError('Already mapped.');
    expect(toAuthError(original)).toBe(original);
  });
});
