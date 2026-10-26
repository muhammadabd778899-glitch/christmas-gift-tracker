import type { DateOnly, Timestamp } from './entities';
import { ValidationError } from './errors';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function dateIssue(message: string, path: string): ValidationError {
  return new ValidationError(message, [{ path, message }]);
}

function parseDateParts(value: string): DateParts | null {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < MIN_YEAR || year > MAX_YEAR) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isValidDateOnly(value: string): value is DateOnly {
  return parseDateParts(value) !== null;
}

export function assertDateOnly(value: string, path = 'date'): asserts value is DateOnly {
  if (!isValidDateOnly(value)) {
    throw dateIssue('Enter a real date in YYYY-MM-DD format.', path);
  }
}

export function timestampNow(now = new Date()): Timestamp {
  return now.toISOString();
}

export function isValidTimestamp(value: string): value is Timestamp {
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const millisecond = Number(match[7]);

  if (year < MIN_YEAR || year > MAX_YEAR) {
    return false;
  }

  if (hour > 23 || minute > 59 || second > 59) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second &&
    date.getUTCMilliseconds() === millisecond
  );
}

export function assertTimestamp(value: string, path = 'timestamp'): asserts value is Timestamp {
  if (!isValidTimestamp(value)) {
    throw dateIssue('Enter a valid UTC timestamp with milliseconds.', path);
  }
}

export function assertTimestampOrder(
  createdAt: string,
  updatedAt: string,
  path = 'updatedAt',
): void {
  assertTimestamp(createdAt, 'createdAt');
  assertTimestamp(updatedAt, path);

  if (updatedAt < createdAt) {
    throw dateIssue('The last-updated time cannot be before the created time.', path);
  }
}

export function localToday(now = new Date()): DateOnly {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calendarDayDifference(from: DateOnly, to: DateOnly): number {
  assertDateOnly(from, 'from');
  assertDateOnly(to, 'to');
  const fromParts = parseDateParts(from);
  const toParts = parseDateParts(to);

  if (!fromParts || !toParts) {
    throw dateIssue('Enter real dates to compare.', 'date');
  }

  const fromTime = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
  const toTime = Date.UTC(toParts.year, toParts.month - 1, toParts.day);
  return Math.round((toTime - fromTime) / 86_400_000);
}

export function formatDateOnly(value: DateOnly, locale: string): string {
  assertDateOnly(value);
  const parts = parseDateParts(value);

  if (!parts) {
    throw dateIssue('Enter a real date.', 'date');
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

export function upcomingChristmasDate(now = new Date()): DateOnly {
  const year = now.getFullYear();
  const christmasThisYearPassed =
    now.getMonth() > 11 || (now.getMonth() === 11 && now.getDate() > 25);
  return `${christmasThisYearPassed ? year + 1 : year}-12-25`;
}

export function defaultSeasonName(year: number): string {
  return `Christmas ${year}`;
}
