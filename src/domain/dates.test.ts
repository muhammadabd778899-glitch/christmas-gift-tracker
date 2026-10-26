import { describe, expect, it } from 'vitest';
import {
  assertTimestampOrder,
  calendarDayDifference,
  defaultSeasonName,
  formatDateOnly,
  isValidDateOnly,
  isValidTimestamp,
  localToday,
  upcomingChristmasDate,
} from './dates';
import { ValidationError } from './errors';

describe('date-only values', () => {
  it('accepts real calendar dates and rejects impossible dates', () => {
    expect(isValidDateOnly('2026-12-25')).toBe(true);
    expect(isValidDateOnly('2024-02-29')).toBe(true);
    expect(isValidDateOnly('2025-02-29')).toBe(false);
    expect(isValidDateOnly('2026-13-01')).toBe(false);
    expect(isValidDateOnly('2026-00-01')).toBe(false);
    expect(isValidDateOnly('2026-1-1')).toBe(false);
    expect(isValidDateOnly('1899-12-25')).toBe(false);
  });

  it('formats a date-only value as a calendar date', () => {
    expect(formatDateOnly('2026-12-25', 'en-US')).toBe('Dec 25, 2026');
  });

  it('calculates calendar-day differences from date components', () => {
    expect(calendarDayDifference('2026-12-25', '2026-12-26')).toBe(1);
    expect(calendarDayDifference('2026-12-26', '2026-12-25')).toBe(-1);
    expect(calendarDayDifference('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('timestamps', () => {
  it('accepts ISO UTC timestamps with milliseconds', () => {
    expect(isValidTimestamp('2026-10-26T12:00:00.000Z')).toBe(true);
    expect(isValidTimestamp('2026-10-26T12:00:00Z')).toBe(false);
    expect(isValidTimestamp('2026-02-30T12:00:00.000Z')).toBe(false);
    expect(isValidTimestamp('2026-10-26T24:00:00.000Z')).toBe(false);
  });

  it('rejects an update timestamp before creation', () => {
    expect(() =>
      assertTimestampOrder('2026-10-26T12:00:00.000Z', '2026-10-26T11:59:59.999Z'),
    ).toThrow(ValidationError);
  });
});

describe('local planner dates', () => {
  it('uses local calendar components for today', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('chooses the upcoming Christmas date', () => {
    expect(upcomingChristmasDate(new Date(2026, 11, 24, 12))).toBe('2026-12-25');
    expect(upcomingChristmasDate(new Date(2026, 11, 25, 23))).toBe('2026-12-25');
    expect(upcomingChristmasDate(new Date(2026, 11, 26, 0))).toBe('2027-12-25');
  });

  it('builds a friendly default season name', () => {
    expect(defaultSeasonName(2026)).toBe('Christmas 2026');
  });
});
