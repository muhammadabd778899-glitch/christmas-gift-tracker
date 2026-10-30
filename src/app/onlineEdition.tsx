import { lazy } from 'react';
import { OnlineSyncProvider } from './online/OnlineSyncProvider';

export const AccountPage = lazy(() => import('../features/account/AccountPage'));
export const SyncStatusIndicator = lazy(() =>
  import('../features/account/SyncStatusIndicator').then((module) => ({
    default: module.SyncStatusIndicator,
  })),
);

export { OnlineSyncProvider };
// Static navigation metadata for the online edition, not a component.
// eslint-disable-next-line react-refresh/only-export-components
export { accountNavItem } from './online/accountNavItem';
