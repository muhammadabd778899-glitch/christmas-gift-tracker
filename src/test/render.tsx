import { cleanup, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach } from 'vitest';
import { StorageProvider } from '../app/providers/StorageProvider';
import { routes } from '../app/router';
import { createTestStorage, type TestStorage } from './storage';

interface RenderAppOptions {
  storage?: TestStorage;
}

const openedStorages: TestStorage[] = [];

afterEach(async () => {
  cleanup();
  await Promise.all(openedStorages.splice(0).map((storage) => storage.cleanup()));
});

export async function renderApp(initialEntries: string[] = ['/'], options: RenderAppOptions = {}) {
  const storage = options.storage ?? (await createTestStorage());
  if (!openedStorages.includes(storage)) {
    openedStorages.push(storage);
  }
  const router = createMemoryRouter(routes, { initialEntries });

  return {
    storage,
    router,
    ...render(
      <StrictMode>
        <StorageProvider repositories={storage.repositories}>
          <RouterProvider router={router} />
        </StorageProvider>
      </StrictMode>,
    ),
  };
}
