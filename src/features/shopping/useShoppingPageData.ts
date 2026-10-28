import type { AppSettings, Gift, Recipient, Season } from '../../domain/entities';
import { useRepositories } from '../../app/providers/storageContext';
import { useLiveQueryState, type LiveQueryState } from '../../app/providers/useLiveQueryState';

export interface ShoppingPageData {
  settings: AppSettings;
  season: Season | null;
  recipients: Recipient[];
  gifts: Gift[];
}

export function useShoppingPageData(): LiveQueryState<ShoppingPageData> {
  const repositories = useRepositories();

  return useLiveQueryState(async () => {
    const settings = await repositories.settings.get();

    if (!settings.activeSeasonId) {
      return {
        settings,
        season: null,
        recipients: [],
        gifts: [],
      };
    }

    const season = await repositories.seasons.get(settings.activeSeasonId);
    const [recipients, gifts] = await Promise.all([
      repositories.recipients.listBySeason(season.id),
      repositories.gifts.listBySeason(season.id),
    ]);

    return { settings, season, recipients, gifts };
  }, [repositories]);
}
