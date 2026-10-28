import type { AppSettings, Gift, Idea, Recipient, Season } from '../../domain/entities';
import { useRepositories } from '../../app/providers/storageContext';
import { useLiveQueryState, type LiveQueryState } from '../../app/providers/useLiveQueryState';

export interface IdeaPageData {
  settings: AppSettings;
  season: Season | null;
  recipients: Recipient[];
  ideas: Idea[];
  gifts: Gift[];
}

export function useIdeaPageData(): LiveQueryState<IdeaPageData> {
  const repositories = useRepositories();

  return useLiveQueryState(async () => {
    const settings = await repositories.settings.get();

    if (!settings.activeSeasonId) {
      return {
        settings,
        season: null,
        recipients: [],
        ideas: [],
        gifts: [],
      };
    }

    const season = await repositories.seasons.get(settings.activeSeasonId);
    const [recipients, ideas, gifts] = await Promise.all([
      repositories.recipients.listBySeason(season.id),
      repositories.ideas.listBySeason(season.id),
      repositories.gifts.listBySeason(season.id),
    ]);

    return { settings, season, recipients, ideas, gifts };
  }, [repositories]);
}
