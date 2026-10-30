import { calculateSeasonTotals, type SeasonTotals } from '../../domain/calculations/dashboard';
import type { AppSettings, Season } from '../../domain/entities';
import { useLiveQueryState, type LiveQueryState } from '../../app/providers/useLiveQueryState';
import { useRepositories } from '../../app/providers/storageContext';

export interface SeasonOverview {
  season: Season;
  recipientCount: number;
  giftCount: number;
  ideaCount: number;
  totals: SeasonTotals;
}

export interface SeasonsPageData {
  settings: AppSettings;
  seasons: Season[];
  activeSeason: Season | null;
  sampleSeason: Season | null;
  overviews: SeasonOverview[];
}

export function useSeasonsPageData(): LiveQueryState<SeasonsPageData> {
  const repositories = useRepositories();

  return useLiveQueryState(async () => {
    const settings = await repositories.settings.get();
    const seasons = await repositories.seasons.list();
    const overviews = await Promise.all(
      seasons.map(async (season): Promise<SeasonOverview> => {
        const [recipients, gifts, ideas] = await Promise.all([
          repositories.recipients.listBySeason(season.id),
          repositories.gifts.listBySeason(season.id),
          repositories.ideas.listBySeason(season.id),
        ]);

        return {
          season,
          recipientCount: recipients.length,
          giftCount: gifts.length,
          ideaCount: ideas.length,
          totals: calculateSeasonTotals(season, gifts),
        };
      }),
    );

    return {
      settings,
      seasons,
      activeSeason: seasons.find((season) => season.status === 'active') ?? null,
      sampleSeason: seasons.find((season) => season.isSample) ?? null,
      overviews,
    };
  }, [repositories]);
}
