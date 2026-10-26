import type { StorageHealth } from '../health';
import { healthCheck } from '../health';
import { resetAllData, type ResetAllDataResult } from '../reset';
import { createRepositoryContext, type RepositoryContext, type RepositoryOptions } from './context';
import { createGiftRepository, type GiftRepository } from './gifts';
import { createIdeaRepository, type IdeaRepository } from './ideas';
import {
  createRecipientRepository,
  type RecipientDeletePolicy,
  type RecipientDeleteResult,
  type RecipientRepository,
} from './recipients';
import { createSeasonRepository, type SeasonRepository } from './seasons';
import { createSettingsRepository, type SettingsRepository } from './settings';

export interface DataRepository {
  healthCheck(): Promise<StorageHealth>;
  resetAllData(confirmation: string): Promise<ResetAllDataResult>;
}

export interface Repositories {
  context: RepositoryContext;
  seasons: SeasonRepository;
  settings: SettingsRepository;
  recipients: RecipientRepository;
  gifts: GiftRepository;
  ideas: IdeaRepository;
  data: DataRepository;
}

export function createRepositories(
  db: RepositoryContext['db'],
  options: RepositoryOptions = {},
): Repositories {
  const context = createRepositoryContext(db, options);

  return {
    context,
    seasons: createSeasonRepository(context),
    settings: createSettingsRepository(context),
    recipients: createRecipientRepository(context),
    gifts: createGiftRepository(context),
    ideas: createIdeaRepository(context),
    data: {
      healthCheck: () => healthCheck(db),
      resetAllData: (confirmation) => resetAllData(context, { confirmation }),
    },
  };
}

export type {
  RepositoryContext,
  RepositoryOptions,
  SeasonRepository,
  SettingsRepository,
  RecipientDeletePolicy,
  RecipientDeleteResult,
  RecipientRepository,
  GiftRepository,
  IdeaRepository,
};
