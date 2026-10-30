export type PersistenceResult = 'granted' | 'denied' | 'unsupported' | 'unavailable';

function getStorageManager(): StorageManager | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.storage;
}

export async function requestPersistentStorage(
  manager: StorageManager | undefined = getStorageManager(),
): Promise<PersistenceResult> {
  if (!manager || typeof manager.persist !== 'function') {
    return 'unsupported';
  }

  try {
    return (await manager.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}
