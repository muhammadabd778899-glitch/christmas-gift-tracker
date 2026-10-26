import Dexie, { type Table } from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { MigrationError } from '../domain/errors';
import { mapStorageError } from './errors';
import { runDataMigrations, type DataMigration } from './migrations';

interface LegacyV0Snapshot {
  version: 0;
  seasonName: string;
  recipients: Array<{ name: string; relationship: string | null }>;
  gifts: Array<{ name: string; amount: string | null }>;
}

interface V1Snapshot {
  version: 1;
  seasons: Array<{ name: string }>;
  recipients: Array<{ name: string; relationship: string | null }>;
  gifts: Array<{ name: string; amount: string | null }>;
}

const syntheticMigration: DataMigration<V1Snapshot> = {
  from: 0,
  to: 1,
  description: 'Shape the synthetic v0 fixture into the version-1 record layout',
  migrate(input) {
    const legacy = input as LegacyV0Snapshot;

    return {
      version: 1,
      seasons: [{ name: legacy.seasonName }],
      recipients: legacy.recipients.map((recipient) => ({ ...recipient })),
      gifts: legacy.gifts.map((gift) => ({ ...gift })),
    };
  },
};

describe('data migration harness', () => {
  it('migrates a synthetic prior-version fixture to version 1 and preserves valid records', () => {
    const fixture: LegacyV0Snapshot = {
      version: 0,
      seasonName: 'Christmas 2025',
      recipients: [
        { name: 'Alex', relationship: 'Family' },
        { name: 'Sam', relationship: null },
      ],
      gifts: [
        { name: 'Warm scarf', amount: '25.00' },
        { name: 'Book of walks', amount: null },
      ],
    };

    const result = runDataMigrations<V1Snapshot>(fixture, 0, 1, [syntheticMigration]);

    expect(result.version).toBe(1);
    expect(result.applied).toEqual([
      {
        from: 0,
        to: 1,
        description: 'Shape the synthetic v0 fixture into the version-1 record layout',
      },
    ]);
    expect(result.data.seasons).toEqual([{ name: 'Christmas 2025' }]);
    expect(result.data.recipients).toEqual(fixture.recipients);
    expect(result.data.gifts).toEqual(fixture.gifts);
  });

  it('fails safely when no path exists or the source is newer', () => {
    expect(() => runDataMigrations({}, 0, 1, [])).toThrow(MigrationError);
    expect(() => runDataMigrations({}, 2, 1, [syntheticMigration])).toThrow(MigrationError);
    expect(() => runDataMigrations({}, 0, 1, [{ ...syntheticMigration, to: 0 }])).toThrow(
      MigrationError,
    );
  });

  it('wraps a throwing migration in a typed error', () => {
    const failure: DataMigration = {
      from: 0,
      to: 1,
      description: 'Deliberate failure',
      migrate() {
        throw new Error('deliberate');
      },
    };

    expect(() => runDataMigrations({}, 0, 1, [failure])).toThrow(MigrationError);
  });
});

class LegacyDatabase extends Dexie {
  records!: Table<{ id: string; value: string }, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ records: 'id' });
  }
}

class FailingUpgradeDatabase extends Dexie {
  records!: Table<{ id: string; value: string }, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ records: 'id' });
    this.version(2)
      .stores({ records: 'id, value' })
      .upgrade(async () => {
        throw new MigrationError('forced migration failure');
      });
  }
}

describe('database upgrade failure', () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await cleanup?.();
    cleanup = undefined;
  });

  it('does not delete or recreate the database when an upgrade fails', async () => {
    const name = `christmas-gift-tracker-migration-test-${crypto.randomUUID()}`;
    cleanup = async () => {
      await Dexie.delete(name);
    };

    const legacy = new LegacyDatabase(name);
    await legacy.open();
    await legacy.records.add({ id: 'kept', value: 'original record' });
    legacy.close();

    const failing = new FailingUpgradeDatabase(name);

    try {
      await failing.open();
      throw new Error('The upgrade should have failed.');
    } catch (error) {
      expect(mapStorageError(error)).toBeInstanceOf(MigrationError);
    } finally {
      failing.close();
    }

    const reopened = new LegacyDatabase(name);
    await reopened.open();
    expect(await reopened.records.get('kept')).toEqual({
      id: 'kept',
      value: 'original record',
    });
    reopened.close();
  });
});
