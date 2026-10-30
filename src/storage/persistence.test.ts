import { describe, expect, it, vi } from 'vitest';
import { requestPersistentStorage } from './persistence';

function manager(persist: () => Promise<boolean>) {
  return { persist } as unknown as StorageManager;
}

describe('requestPersistentStorage', () => {
  it('reports granted when the browser persists storage', async () => {
    await expect(requestPersistentStorage(manager(async () => true))).resolves.toBe('granted');
  });

  it('reports denied when the browser declines', async () => {
    await expect(requestPersistentStorage(manager(async () => false))).resolves.toBe('denied');
  });

  it('reports unsupported when the storage manager is missing', async () => {
    await expect(requestPersistentStorage(undefined)).resolves.toBe('unsupported');
  });

  it('reports unsupported when persist is not a function', async () => {
    await expect(requestPersistentStorage({} as unknown as StorageManager)).resolves.toBe(
      'unsupported',
    );
  });

  it('reports unavailable when the request throws', async () => {
    const persist = vi.fn(async () => {
      throw new Error('blocked');
    });

    await expect(requestPersistentStorage(manager(persist))).resolves.toBe('unavailable');
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
