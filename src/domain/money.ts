import type { FractionDigits, MinorUnits } from './entities';
import { ValidationError } from './errors';

export const MAX_MINOR_UNITS = 99_999_999_999;
export const MIN_MINOR_UNITS = 0;

export interface CurrencyDefinition {
  code: string;
  symbol: string;
  fractionDigits: FractionDigits;
  label: string;
}

export const CURRENCY_PRESETS: readonly CurrencyDefinition[] = [
  { code: 'USD', symbol: '$', fractionDigits: 2, label: 'US dollar' },
  { code: 'EUR', symbol: '€', fractionDigits: 2, label: 'Euro' },
  { code: 'GBP', symbol: '£', fractionDigits: 2, label: 'British pound' },
  { code: 'CAD', symbol: '$', fractionDigits: 2, label: 'Canadian dollar' },
  { code: 'AUD', symbol: '$', fractionDigits: 2, label: 'Australian dollar' },
  { code: 'JPY', symbol: '¥', fractionDigits: 0, label: 'Japanese yen' },
];

export const DEFAULT_CURRENCY = CURRENCY_PRESETS[0];

export interface ParseMoneyOptions {
  fractionDigits: FractionDigits;
  currencySymbol?: string | null;
}

export interface FormatMoneyOptions {
  fractionDigits: FractionDigits;
  currencySymbol: string;
  locale: string;
}

interface SeparatorInfo {
  decimalIndex: number | null;
  groupingIndexes: number[];
}

function moneyIssue(message: string, path = 'amount'): ValidationError {
  return new ValidationError(message, [{ path, message }]);
}

export function isValidMinorUnits(value: number): value is MinorUnits {
  return Number.isSafeInteger(value) && value >= MIN_MINOR_UNITS && value <= MAX_MINOR_UNITS;
}

export function assertMinorUnits(value: number, path = 'amount'): asserts value is MinorUnits {
  if (!Number.isInteger(value)) {
    throw moneyIssue('Use a whole number of minor units.', path);
  }

  if (value < MIN_MINOR_UNITS) {
    throw moneyIssue('Amounts cannot be negative.', path);
  }

  if (!Number.isSafeInteger(value) || value > MAX_MINOR_UNITS) {
    throw moneyIssue('This amount is too large.', path);
  }
}

function assertValidGrouping(value: string, separator: string): void {
  const groups = value.split(separator);

  if (
    groups.length < 2 ||
    groups.some((group) => !/^\d+$/.test(group)) ||
    groups[0].length === 0 ||
    groups[0].length > 3 ||
    groups.slice(1).some((group) => group.length !== 3)
  ) {
    throw moneyIssue('Use grouping separators in groups of three digits.');
  }
}

function separatorInfo(value: string, fractionDigits: FractionDigits): SeparatorInfo {
  const dotIndexes = [...value.matchAll(/\./g)].map((match) => match.index ?? -1);
  const commaIndexes = [...value.matchAll(/,/g)].map((match) => match.index ?? -1);

  if (dotIndexes.length > 0 && commaIndexes.length > 0) {
    const dotIsDecimal = (dotIndexes.at(-1) ?? -1) > (commaIndexes.at(-1) ?? -1);
    const decimalIndexes = dotIsDecimal ? dotIndexes : commaIndexes;
    const groupingIndexes = dotIsDecimal ? commaIndexes : dotIndexes;

    if (decimalIndexes.length !== 1) {
      throw moneyIssue('Use only one decimal separator.');
    }

    const decimalIndex = decimalIndexes[0] ?? -1;
    const fractionalLength = value.length - decimalIndex - 1;

    if (fractionalLength === 0) {
      throw moneyIssue('Add the digits after the decimal separator.');
    }

    if (fractionalLength > fractionDigits) {
      throw moneyIssue(`Use no more than ${fractionDigits} decimal places.`);
    }

    return { decimalIndex, groupingIndexes };
  }

  const indexes = dotIndexes.length > 0 ? dotIndexes : commaIndexes;

  if (indexes.length === 0) {
    return { decimalIndex: null, groupingIndexes: [] };
  }

  if (indexes.length > 1) {
    return { decimalIndex: null, groupingIndexes: indexes };
  }

  const decimalIndex = indexes[0] ?? -1;
  const fractionalLength = value.length - decimalIndex - 1;

  if (fractionalLength === 0) {
    throw moneyIssue('Add the digits after the separator.');
  }

  if (fractionDigits > 0 && fractionalLength <= fractionDigits) {
    return { decimalIndex, groupingIndexes: [] };
  }

  return { decimalIndex: null, groupingIndexes: indexes };
}

export function parseMoneyInput(raw: string, options: ParseMoneyOptions): MinorUnits | null {
  let value = raw.trim();

  if (!value) {
    return null;
  }

  const symbol = options.currencySymbol?.trim();
  if (symbol) {
    if (value.startsWith(symbol)) {
      value = value.slice(symbol.length).trim();
    } else if (value.endsWith(symbol)) {
      value = value.slice(0, -symbol.length).trim();
    }
  }

  value = value.replace(/[\s']/g, '');

  if (!value) {
    return null;
  }

  if (!/^[\d.,]+$/.test(value)) {
    throw moneyIssue('Enter an amount using digits, a decimal point, or a decimal comma.');
  }

  const separators = separatorInfo(value, options.fractionDigits);

  if (separators.decimalIndex === null && separators.groupingIndexes.length > 0) {
    const groupingSeparator = value[separators.groupingIndexes[0] ?? 0] ?? '';
    assertValidGrouping(value, groupingSeparator);
  }

  if (separators.decimalIndex !== null && separators.groupingIndexes.length > 0) {
    const groupingSeparator = value[separators.groupingIndexes[0] ?? 0] ?? '';
    assertValidGrouping(value.slice(0, separators.decimalIndex), groupingSeparator);
  }

  let integerDigits: string;
  let fractionalDigits = '';

  if (separators.decimalIndex === null) {
    integerDigits = value.replace(/[.,]/g, '');
  } else {
    const integerPart = value.slice(0, separators.decimalIndex).replace(/[.,]/g, '');
    const fractionalPart = value.slice(separators.decimalIndex + 1);

    integerDigits = integerPart || '0';
    fractionalDigits = fractionalPart.padEnd(options.fractionDigits, '0');
  }

  if (!/^\d+$/.test(integerDigits)) {
    throw moneyIssue('Enter a valid amount.');
  }

  if (fractionalDigits && !/^\d+$/.test(fractionalDigits)) {
    throw moneyIssue('Enter a valid amount.');
  }

  const factor = 10n ** BigInt(options.fractionDigits);
  const minor = BigInt(integerDigits) * factor + BigInt(fractionalDigits || '0');

  if (minor > BigInt(MAX_MINOR_UNITS)) {
    throw moneyIssue('This amount is too large.');
  }

  const result = Number(minor);
  assertMinorUnits(result);
  return result;
}

function decimalSeparator(locale: string): string {
  return (
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })
      .formatToParts(1.1)
      .find((part) => part.type === 'decimal')?.value ?? '.'
  );
}

export function formatMoney(value: number | null | undefined, options: FormatMoneyOptions): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (!Number.isSafeInteger(value)) {
    throw moneyIssue('The amount to display is not a safe integer.');
  }

  const factor = 10n ** BigInt(options.fractionDigits);
  const absolute = BigInt(Math.abs(value));
  const major = absolute / factor;
  const fraction = absolute % factor;
  const fractionText = options.fractionDigits
    ? `${decimalSeparator(options.locale)}${fraction
        .toString()
        .padStart(options.fractionDigits, '0')}`
    : '';
  const majorText = new Intl.NumberFormat(options.locale, {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(major);
  const sign = value < 0 ? '-' : '';

  return `${sign}${options.currencySymbol}${majorText}${fractionText}`;
}

export function formatMinorUnitsForInput(
  value: number | null | undefined,
  fractionDigits: FractionDigits,
): string {
  if (value === null || value === undefined) {
    return '';
  }

  assertMinorUnits(value);
  const factor = 10n ** BigInt(fractionDigits);
  const minor = BigInt(value);
  const major = minor / factor;

  if (fractionDigits === 0) {
    return major.toString();
  }

  return `${major.toString()}.${(minor % factor).toString().padStart(fractionDigits, '0')}`;
}
