import { useEffect } from 'react';
import { applyTheme, writeStoredTheme } from '../lib/theme';
import { useTheme } from './providers/useTheme';

export function ThemeController() {
  const { preference, resolved } = useTheme();

  useEffect(() => {
    if (!preference) {
      return;
    }

    writeStoredTheme(preference);
    applyTheme(resolved);
  }, [preference, resolved]);

  return null;
}
