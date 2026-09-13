import { formatNumberGrouped } from '../shared/format.ts';

export interface UnixParse {
  ms: number;
  unit: 's' | 'ms';
}

export type UnixParseResult = { ok: true; parsed: UnixParse } | { ok: false; error: string };

/** Inclusive ISO 8601 year 1–9999 bounds in epoch milliseconds (UTC).
 *  Literal constants: Date.UTC maps years 0–99 to 1900+y, so it cannot
 *  express 0001-01-01. */
const MIN_MS = -62135596800000; // 0001-01-01T00:00:00.000Z
const MAX_MS = 253402300799999; // 9999-12-31T23:59:59.999Z

/** Average Gregorian month/year in seconds, used for relative-time units. */
const AVG_MONTH_SECONDS = 2629746; // 30.436875 days
const AVG_YEAR_SECONDS = 31556952; // 365.2425 days

const NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

/**
 * Parses a Unix timestamp given in seconds or milliseconds. Digits decide the
 * unit: up to 11 integer digits are seconds, 12 or more are milliseconds.
 * A decimal fraction (e.g. `1700000000.5`) is seconds with fractional ms.
 */
export function parseUnixTimestamp(text: string): UnixParseResult {
  const trimmed = text.trim();
  if (trimmed === '' || !NUMBER_PATTERN.test(trimmed)) {
    return { ok: false, error: 'Enter a numeric Unix timestamp' };
  }

  const negative = trimmed.startsWith('-');
  const digits = negative ? trimmed.slice(1) : trimmed;
  const integerDigits = digits.split('.')[0].length;

  let ms: number;
  let unit: 's' | 'ms';
  if (integerDigits >= 12) {
    unit = 'ms';
    ms = Number(digits);
  } else {
    // Seconds, optionally with a fractional part, quantised to whole ms.
    unit = 's';
    ms = Math.round(Number(digits) * 1000);
  }
  if (negative) ms = -ms;

  if (!Number.isFinite(ms) || ms < MIN_MS || ms > MAX_MS) {
    return { ok: false, error: 'Timestamp is outside the supported date range (years 1–9999)' };
  }
  return { ok: true, parsed: { ms, unit } };
}

/**
 * Parses a date in ISO 8601 (with `Z`, offsets or date-only) and also accepts
 * a space instead of `T` (`YYYY-MM-DD HH:mm:ss`).
 */
export function parseDateInput(
  text: string,
): { ok: true; ms: number } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: 'Could not parse the date (use ISO 8601)' };

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}/.test(trimmed) ? trimmed.replace(' ', 'T') : trimmed;
  const ms = Date.parse(normalized);
  if (Number.isNaN(ms)) {
    return { ok: false, error: 'Could not parse the date (use ISO 8601)' };
  }
  return { ok: true, ms };
}

const UNIT_LADDER: ReadonlyArray<{ limitSeconds: number; divisorSeconds: number; unit: string }> = [
  { limitSeconds: 60, divisorSeconds: 1, unit: 'second' },
  { limitSeconds: 3600, divisorSeconds: 60, unit: 'minute' },
  { limitSeconds: 86400, divisorSeconds: 3600, unit: 'hour' },
  { limitSeconds: 604800, divisorSeconds: 86400, unit: 'day' },
  { limitSeconds: AVG_MONTH_SECONDS, divisorSeconds: 604800, unit: 'week' },
  { limitSeconds: AVG_YEAR_SECONDS, divisorSeconds: AVG_MONTH_SECONDS, unit: 'month' },
];

function pluralize(count: number, unit: string): string {
  return count === 1 ? unit : `${unit}s`;
}

/**
 * Human-readable relative time, deterministic for a given `now`. Values within
 * one second count as the same moment; larger values are rounded to the
 * nearest whole unit (e.g. 1.5 days → `2 days`).
 */
export function relativeTime(ms: number, now: number = Date.now()): string {
  const deltaSeconds = (ms - now) / 1000;
  const magnitude = Math.abs(deltaSeconds);
  if (magnitude < 1) return 'just now';

  let count: number;
  let unit: string;
  const rung = UNIT_LADDER.find((entry) => magnitude < entry.limitSeconds);
  if (rung) {
    count = Math.round(magnitude / rung.divisorSeconds);
    unit = rung.unit;
  } else {
    count = Math.round(magnitude / AVG_YEAR_SECONDS);
    unit = 'year';
  }
  const phrase = `${count} ${pluralize(count, unit)}`;
  return deltaSeconds > 0 ? `in ${phrase}` : `${phrase} ago`;
}

export interface UnixTimestampDescription {
  isoUtc: string;
  local: string;
  relative: string;
  seconds: string;
  milliseconds: string;
}

/** Describes an epoch-milliseconds moment in UTC, local and relative terms. */
export function describeUnixTimestamp(
  ms: number,
  now: number = Date.now(),
): UnixTimestampDescription {
  return {
    isoUtc: new Date(ms).toISOString(),
    local: new Date(ms).toString(),
    relative: relativeTime(ms, now),
    seconds: formatNumberGrouped(Math.floor(ms / 1000)),
    milliseconds: formatNumberGrouped(ms),
  };
}
