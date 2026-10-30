import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../app/providers/useTheme';
import { IconButton } from '../ui/IconButton';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { resolved, setPreference } = useTheme();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = resolved === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? 'Switch to dark theme' : 'Switch to light theme';

  async function handleClick() {
    setPending(true);
    setError(null);

    try {
      await setPreference(next);
    } catch {
      setError('Theme could not be saved.');
    } finally {
      setPending(false);
    }
  }

  return (
    <span className={styles.wrap}>
      <IconButton
        label={label}
        icon={resolved === 'dark' ? <Sun /> : <Moon />}
        onClick={() => void handleClick()}
        disabled={pending}
      />
      {error ? (
        <span role="status" className={styles.error}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
