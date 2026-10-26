import { RouterProvider } from 'react-router-dom';
import type { Repositories } from '../storage/repositories';
import { AppErrorBoundary } from './boundaries/AppErrorBoundary';
import { StorageProvider } from './providers/StorageProvider';
import { createAppRouter } from './router';

const router = createAppRouter();

interface AppProps {
  repositories: Repositories;
}

export function App({ repositories }: AppProps) {
  return (
    <AppErrorBoundary>
      <StorageProvider repositories={repositories}>
        <RouterProvider router={router} />
      </StorageProvider>
    </AppErrorBoundary>
  );
}
