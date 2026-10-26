import type { ReactNode } from 'react';
import type { Repositories } from '../../storage/repositories';
import { StorageContext } from './storageContext';

interface StorageProviderProps {
  repositories: Repositories;
  children: ReactNode;
}

export function StorageProvider({ repositories, children }: StorageProviderProps) {
  return <StorageContext.Provider value={repositories}>{children}</StorageContext.Provider>;
}
