import type { AppSettings, MetaRecord, Timestamp } from '../domain/entities';
import { timestampNow } from '../domain/dates';
import { normalizeLocale } from '../domain/locale';
import { DEFAULT_CURRENCY } from '../domain/money';

interface DefaultSettingsOptions {
  locale?: string | null;
  now: Date;
}

export function createDefaultSettings({ locale, now }: DefaultSettingsOptions): AppSettings {
  const timestamp = timestampNow(now);

  return {
    id: 'app',
    activeSeasonId: null,
    currencyCode: DEFAULT_CURRENCY.code,
    currencySymbol: DEFAULT_CURRENCY.symbol,
    fractionDigits: DEFAULT_CURRENCY.fractionDigits,
    locale: normalizeLocale(locale),
    theme: 'system',
    hasCompletedOnboarding: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function metaRecord<K extends MetaRecord['key']>(
  key: K,
  value: Extract<MetaRecord, { key: K }>['value'],
  updatedAt: Timestamp,
): Extract<MetaRecord, { key: K }> {
  return { key, value, updatedAt } as Extract<MetaRecord, { key: K }>;
}

interface MetaRecordsOptions {
  databaseId: string;
  appVersion: string;
  schemaVersion: number;
  now: Date;
  lastMigration?: { from: number; to: number; at: Timestamp };
}

export function createMetaRecords({
  databaseId,
  appVersion,
  schemaVersion,
  now,
  lastMigration,
}: MetaRecordsOptions): MetaRecord[] {
  const timestamp = timestampNow(now);
  const records: MetaRecord[] = [
    metaRecord('schemaVersion', schemaVersion, timestamp),
    metaRecord('databaseId', databaseId, timestamp),
    metaRecord('appVersion', appVersion, timestamp),
    metaRecord('lastOpenedAt', timestamp, timestamp),
  ];

  if (lastMigration) {
    records.push(metaRecord('lastMigration', lastMigration, timestamp));
  }

  return records;
}
