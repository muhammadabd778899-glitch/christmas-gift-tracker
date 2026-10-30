import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './AppShell';
import { RouteErrorPage } from './boundaries/RouteErrorPage';
import { DashboardPage } from '../pages/DashboardPage';
import { GiftsPage } from '../pages/GiftsPage';
import { IdeasPage } from '../pages/IdeasPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RecipientDetailPage } from '../pages/RecipientDetailPage';
import { RecipientsPage } from '../pages/RecipientsPage';
import { SeasonSetupPage } from '../pages/SeasonSetupPage';
import { SeasonsPage } from '../pages/SeasonsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ShoppingPage } from '../pages/ShoppingPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'gifts', element: <GiftsPage /> },
      { path: 'recipients', element: <RecipientsPage /> },
      { path: 'recipients/:recipientId', element: <RecipientDetailPage /> },
      { path: 'ideas', element: <IdeasPage /> },
      { path: 'shopping', element: <ShoppingPage /> },
      { path: 'seasons', element: <SeasonsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'onboarding', element: <SeasonSetupPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
