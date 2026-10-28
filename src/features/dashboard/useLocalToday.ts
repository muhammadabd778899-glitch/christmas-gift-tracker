import { useEffect, useState } from 'react';
import type { DateOnly } from '../../domain/entities';
import { localToday } from '../../domain/dates';

/**
 * Keep the dashboard's calendar date current without relying on a reload.
 * A minute-level check is enough for a day counter and is more robust than a
 * one-shot midnight timer when the device sleeps or the tab is restored.
 */
export function useLocalToday(): DateOnly {
  const [today, setToday] = useState<DateOnly>(() => localToday());

  useEffect(() => {
    const update = () => setToday(localToday());

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        update();
      }
    };

    const interval = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', update);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', update);
    };
  }, []);

  return today;
}
