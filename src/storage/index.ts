export {
  APP_DATABASE_NAME,
  SCHEMA_VERSION,
  V1_STORES,
  appDatabase,
  createDatabase,
  GiftTrackerDatabase,
} from './db';
export {
  initializeStorage,
  type InitializeStorageOptions,
  type InitializedStorage,
} from './initialize';
export { healthCheck, type HealthIssue, type HealthIssueCode, type StorageHealth } from './health';
export { resetAllData, type ResetAllDataOptions, type ResetAllDataResult } from './reset';
export {
  createRepositories,
  type DataRepository,
  type GiftRepository,
  type IdeaRepository,
  type RecipientDeletePolicy,
  type RecipientDeleteResult,
  type RecipientRepository,
  type Repositories,
  type RepositoryContext,
  type RepositoryOptions,
  type SeasonRepository,
  type SettingsRepository,
} from './repositories';
export { mapStorageError, toAppError, withStorageErrors } from './errors';
export { runDataMigrations, type DataMigration, type DataMigrationResult } from './migrations';
