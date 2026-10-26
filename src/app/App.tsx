import { RouterProvider } from 'react-router-dom';
import { AppErrorBoundary } from './boundaries/AppErrorBoundary';
import { createAppRouter } from './router';

const router = createAppRouter();

export function App() {
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  );
}
