import { createContext, useContext } from 'react';
import type { Repositories } from '../../storage/repositories';

export const StorageContext = createContext<Repositories | null>(null);

export function useRepositories(): Repositories {
  const repositories = useContext(StorageContext);

  if (!repositories) {
    throw new Error('The storage provider is missing from the application tree.');
  }

  return repositories;
}
