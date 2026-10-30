import type { StorageHealth } from '../health';
import { healthCheck } from '../health';
import {
  createBackup,
  restoreBackup,
  validateBackup,
  type BackupExport,
  type BackupSource,
  type RestoreBackupResult,
  type ValidatedBackup,
} from '../backup';
import { exportCsv, type CsvExport, type CsvExportOptions } from '../csv';
import { hasStoredMonetaryData } from '../dataPresence';
import {
  loadSampleData,
  removeSampleData,
  type LoadSampleDataResult,
  type RemoveSampleDataResult,
} from '../sample';
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
import { createSeasonRepository, type SeasonCreateOptions, type SeasonRepository } from './seasons';
import { createSettingsRepository, type SettingsRepository } from './settings';

export interface DataRepository {
  healthCheck(): Promise<StorageHealth>;
  hasMonetaryData(): Promise<boolean>;
  resetAllData(confirmation: string): Promise<ResetAllDataResult>;
  exportBackup(): Promise<BackupExport>;
  validateBackup(file: BackupSource): Promise<ValidatedBackup>;
  restoreBackup(file: BackupSource, confirmation: string): Promise<RestoreBackupResult>;
  exportCsv(options: CsvExportOptions): Promise<CsvExport>;
  loadSampleData(): Promise<LoadSampleDataResult>;
  removeSampleData(): Promise<RemoveSampleDataResult>;
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
      hasMonetaryData: () => hasStoredMonetaryData(db),
      resetAllData: (confirmation) => resetAllData(context, { confirmation }),
      exportBackup: () => createBackup(context),
      validateBackup: (file) => validateBackup(file),
      restoreBackup: (file, confirmation) => restoreBackup(context, file, { confirmation }),
      exportCsv: (options) => exportCsv(context, options),
      loadSampleData: () => loadSampleData(context),
      removeSampleData: () => removeSampleData(context),
    },
  };
}

export type {
  RepositoryContext,
  RepositoryOptions,
  SeasonCreateOptions,
  SeasonRepository,
  SettingsRepository,
  RecipientDeletePolicy,
  RecipientDeleteResult,
  RecipientRepository,
  GiftRepository,
  IdeaRepository,
  BackupExport,
  BackupSource,
  ValidatedBackup,
  RestoreBackupResult,
  CsvExport,
  CsvExportOptions,
  LoadSampleDataResult,
  RemoveSampleDataResult,
};
