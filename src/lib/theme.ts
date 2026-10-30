import type { ThemePreference } from '../domain/entities';

export const THEME_STORAGE_KEY = 'christmas-gift-tracker-theme';
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

export const THEME_COLORS = {
  light: '#f6f1e7',
  dark: '#0e1613',
} as const;

export type ResolvedTheme = keyof typeof THEME_COLORS;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }

  return preference;
}

export function systemThemeQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  try {
    return window.matchMedia(SYSTEM_THEME_QUERY);
  } catch {
    return null;
  }
}

// The localStorage mirror exists only for the synchronous pre-paint read.
// IndexedDB settings remain authoritative once storage has loaded (D-017).
export function readStoredTheme(): ThemePreference | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // A blocked mirror must never break the app; the next load falls back to system.
  }
}

export function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', THEME_COLORS[theme]);
}
