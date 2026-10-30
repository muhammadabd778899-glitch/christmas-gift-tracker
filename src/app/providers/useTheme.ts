import { useCallback, useEffect, useState } from 'react';
import type { ThemePreference } from '../../domain/entities';
import {
  readStoredTheme,
  resolveTheme,
  systemThemeQuery,
  type ResolvedTheme,
} from '../../lib/theme';
import { useActiveSeason } from './useActiveSeason';
import { useRepositories } from './storageContext';

export interface ThemeState {
  preference: ThemePreference | null;
  resolved: ResolvedTheme;
  loading: boolean;
  error: unknown;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

export function useTheme(): ThemeState {
  const repositories = useRepositories();
  const active = useActiveSeason();
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => systemThemeQuery()?.matches ?? false,
  );

  useEffect(() => {
    const media = systemThemeQuery();
    if (!media) {
      return;
    }

    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, []);

  const preference = active.data?.settings.theme ?? null;
  const resolved = resolveTheme(preference ?? readStoredTheme() ?? 'system', systemPrefersDark);

  const setPreference = useCallback(
    async (next: ThemePreference) => {
      await repositories.settings.update({ theme: next });
    },
    [repositories],
  );

  return {
    preference,
    resolved,
    loading: active.loading,
    error: active.error,
    setPreference,
  };
}
