import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function mediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  return window.matchMedia(QUERY);
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => mediaQuery()?.matches ?? false);

  useEffect(() => {
    const media = mediaQuery();

    if (!media) {
      return;
    }

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
