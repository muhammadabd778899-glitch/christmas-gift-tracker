import { describe, expect, it } from 'vitest';
import { ValidationError } from './errors';
import {
  MAX_MINOR_UNITS,
  formatMinorUnitsForInput,
  formatMoney,
  isValidMinorUnits,
  parseMoneyInput,
} from './money';

const usd = { fractionDigits: 2 as const, currencySymbol: '$' };

describe('money parsing', () => {
  it('parses plain, grouped, and symbol-prefixed amounts into minor units', () => {
    expect(parseMoneyInput('1234', usd)).toBe(123400);
    expect(parseMoneyInput('$1,234.56', usd)).toBe(123456);
    expect(parseMoneyInput('1.234,56', usd)).toBe(123456);
    expect(parseMoneyInput('1 234,5', usd)).toBe(123450);
    expect(parseMoneyInput("1'234.00", usd)).toBe(123400);
    expect(parseMoneyInput('0', usd)).toBe(0);
    expect(parseMoneyInput('0.00', usd)).toBe(0);
  });

  it('treats a single separator as a grouping separator when it has too many trailing digits', () => {
    expect(parseMoneyInput('1,234', usd)).toBe(123400);
    expect(parseMoneyInput('1.234', usd)).toBe(123400);
  });

  it('uses the rightmost separator when both are present', () => {
    expect(parseMoneyInput('1,234.56', usd)).toBe(123456);
    expect(parseMoneyInput('1.234,56', usd)).toBe(123456);
  });

  it('supports a zero-decimal preset', () => {
    expect(parseMoneyInput('¥1,234', { fractionDigits: 0, currencySymbol: '¥' })).toBe(1234);
    expect(parseMoneyInput('1234', { fractionDigits: 0 })).toBe(1234);
  });

  it('returns null for empty input', () => {
    expect(parseMoneyInput('', usd)).toBeNull();
    expect(parseMoneyInput('   ', usd)).toBeNull();
    expect(parseMoneyInput('$', usd)).toBeNull();
  });

  it('rejects negative, malformed, and over-precise input', () => {
    expect(() => parseMoneyInput('-5', usd)).toThrow(ValidationError);
    expect(() => parseMoneyInput('$12abc', usd)).toThrow(ValidationError);
    expect(() => parseMoneyInput('1.2.3', usd)).toThrow(ValidationError);
    expect(() => parseMoneyInput('1,234.567', usd)).toThrow(ValidationError);
    expect(() => parseMoneyInput('1,234.', usd)).toThrow(ValidationError);
  });

  it('rejects amounts above the storage limit', () => {
    expect(() => parseMoneyInput('100000000000', usd)).toThrow(ValidationError);
    expect(isValidMinorUnits(MAX_MINOR_UNITS)).toBe(true);
    expect(isValidMinorUnits(MAX_MINOR_UNITS + 1)).toBe(false);
  });

  it('rejects non-integer and unsafe domain values', () => {
    expect(isValidMinorUnits(1.5)).toBe(false);
    expect(isValidMinorUnits(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    expect(isValidMinorUnits(-1)).toBe(false);
  });
});

describe('money formatting', () => {
  it('always shows the configured decimals and groups major units', () => {
    expect(formatMoney(123456, { locale: 'en-US', currencySymbol: '$', fractionDigits: 2 })).toBe(
      '$1,234.56',
    );
    expect(formatMoney(1234, { locale: 'en-US', currencySymbol: '¥', fractionDigits: 0 })).toBe(
      '¥1,234',
    );
    expect(formatMoney(120, { locale: 'en-US', currencySymbol: '$', fractionDigits: 2 })).toBe(
      '$1.20',
    );
  });

  it('places the minus before the symbol', () => {
    expect(formatMoney(-2500, { locale: 'en-US', currencySymbol: '$', fractionDigits: 2 })).toBe(
      '-$25.00',
    );
  });

  it('does not render unset values as zero', () => {
    expect(formatMoney(null, { locale: 'en-US', currencySymbol: '$', fractionDigits: 2 })).toBe(
      '—',
    );
  });

  it('formats exact minor units for editing without grouping', () => {
    expect(formatMinorUnitsForInput(123456, 2)).toBe('1234.56');
    expect(formatMinorUnitsForInput(1234, 0)).toBe('1234');
    expect(formatMinorUnitsForInput(null, 2)).toBe('');
  });
});
