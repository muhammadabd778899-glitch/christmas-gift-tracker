import { liveQuery } from 'dexie';
import { useEffect, useState, type DependencyList } from 'react';

export interface LiveQueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: unknown;
}

/**
 * Small, error-aware wrapper around Dexie liveQuery.
 *
 * The official React hook is convenient, but it rethrows query errors during
 * render. Pages need an explicit error state so an unreadable record never
 * looks like an empty list.
 */
export function useLiveQueryState<T>(
  query: () => Promise<T>,
  dependencies: DependencyList,
): LiveQueryState<T> {
  const [state, setState] = useState<LiveQueryState<T>>({
    data: undefined,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    const subscription = liveQuery(query).subscribe({
      next: (data) => {
        if (active) {
          setState({ data, loading: false, error: null });
        }
      },
      error: (error: unknown) => {
        if (active) {
          setState({ data: undefined, loading: false, error });
        }
      },
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // The caller owns the query dependencies; the query function is intentionally
    // recreated on those boundaries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return state;
}
