import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EditionNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface OnlineSyncProviderProps {
  children: ReactNode;
}

export interface EditionRuntime {
  OnlineSyncProvider: ComponentType<OnlineSyncProviderProps> | null;
  AccountPage: LazyExoticComponent<ComponentType> | null;
  SyncStatusIndicator: ComponentType | null;
  accountNavItem: EditionNavItem | null;
}
