import {
  Archive,
  Gift,
  LayoutDashboard,
  Lightbulb,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    label: 'Plan',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/gifts', label: 'Gifts', icon: Gift },
      { to: '/recipients', label: 'Recipients', icon: Users },
    ],
  },
  {
    label: 'Shop',
    items: [
      { to: '/ideas', label: 'Idea Bank', icon: Lightbulb },
      { to: '/shopping', label: 'Shopping List', icon: ShoppingBag },
    ],
  },
  {
    label: 'Organize',
    items: [
      { to: '/seasons', label: 'Archives', icon: Archive },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/gifts': 'Gifts',
  '/recipients': 'Recipients',
  '/ideas': 'Idea Bank',
  '/shopping': 'Shopping List',
  '/seasons': 'Archives',
  '/settings': 'Settings',
};

export function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }
  if (pathname.startsWith('/recipients/')) {
    return 'Recipient details';
  }
  return 'Page not found';
}
