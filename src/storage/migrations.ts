import { MigrationError, isAppError } from '../domain/errors';

export interface DataMigration<T = unknown> {
  from: number;
  to: number;
  description: string;
  migrate: (input: unknown) => T;
}

export interface DataMigrationResult<T> {
  version: number;
  data: T;
  applied: Array<{ from: number; to: number; description: string }>;
}

export function runDataMigrations<T>(
  input: unknown,
  currentVersion: number,
  targetVersion: number,
  migrations: readonly DataMigration[],
): DataMigrationResult<T> {
  if (!Number.isInteger(currentVersion) || !Number.isInteger(targetVersion)) {
    throw new MigrationError('Migration versions must be whole numbers.');
  }

  if (currentVersion < 0 || targetVersion < 0) {
    throw new MigrationError('Migration versions cannot be negative.');
  }

  if (currentVersion > targetVersion) {
    throw new MigrationError('This data was created by a newer version of the planner.', {
      recovery:
        'Your current data has not been changed. Open the newer version, or update this app before importing the file.',
    });
  }

  let version = currentVersion;
  let data = input;
  const applied: DataMigrationResult<T>['applied'] = [];

  while (version < targetVersion) {
    const migration = migrations.find((candidate) => candidate.from === version);

    if (!migration) {
      throw new MigrationError(`No migration is available from version ${version}.`);
    }

    if (migration.to <= version || migration.to > targetVersion) {
      throw new MigrationError('The migration path is not valid.');
    }

    try {
      data = migration.migrate(data);
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }

      throw new MigrationError(`Migration from version ${version} failed safely.`, {
        cause: error,
      });
    }

    applied.push({
      from: migration.from,
      to: migration.to,
      description: migration.description,
    });
    version = migration.to;
  }

  return { version, data: data as T, applied };
}
