import type { AppSettings, Season } from '../../domain/entities';
import { useLiveQueryState, type LiveQueryState } from './useLiveQueryState';
import { useRepositories } from './storageContext';

export interface ActiveSeasonContext {
  settings: AppSettings;
  season: Season | null;
}

export function useActiveSeason(): LiveQueryState<ActiveSeasonContext> {
  const repositories = useRepositories();

  return useLiveQueryState(async () => {
    const settings = await repositories.settings.get();
    const season = settings.activeSeasonId
      ? await repositories.seasons.get(settings.activeSeasonId)
      : null;

    return { settings, season };
  }, [repositories]);
}
