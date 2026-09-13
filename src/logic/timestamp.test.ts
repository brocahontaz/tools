import { describe, expect, it } from 'vitest';
import {
  describeUnixTimestamp,
  parseDateInput,
  parseUnixTimestamp,
  relativeTime,
} from './timestamp.ts';

const KNOWN_MS = 1700000000500; // 2023-11-14T22:13:20.500Z

describe('parseUnixTimestamp', () => {
  it('detects seconds for short values', () => {
    expect(parseUnixTimestamp('1700000000')).toEqual({
      ok: true,
      parsed: { ms: 1700000000000, unit: 's' },
    });
  });

  it('treats 14-digit values as milliseconds within range', () => {
    expect(parseUnixTimestamp('99999999999999')).toEqual({
      ok: true,
      parsed: { ms: 99999999999999, unit: 'ms' },
    });
  });

  it('detects milliseconds for 12+ digit values', () => {
    expect(parseUnixTimestamp('1700000000000')).toEqual({
      ok: true,
      parsed: { ms: 1700000000000, unit: 'ms' },
    });
    expect(parseUnixTimestamp('99999999999')).toEqual({
      ok: true,
      parsed: { ms: 99999999999000, unit: 's' },
    });
  });

  it('accepts negative seconds', () => {
    expect(parseUnixTimestamp('-86400')).toEqual({
      ok: true,
      parsed: { ms: -86400000, unit: 's' },
    });
  });

  it('accepts an explicit decimal fraction as seconds', () => {
    expect(parseUnixTimestamp('1700000000.5')).toEqual({
      ok: true,
      parsed: { ms: 1700000000500, unit: 's' },
    });
  });

  it('trims surrounding whitespace', () => {
    expect(parseUnixTimestamp('  1700000000 \n')).toEqual({
      ok: true,
      parsed: { ms: 1700000000000, unit: 's' },
    });
  });

  it('rejects non-numeric input', () => {
    for (const bad of ['abc', '', '  ', '12 34', '1e9', '0x10', '1700000000,5']) {
      const failure = parseUnixTimestamp(bad);
      expect(failure).toEqual({ ok: false, error: 'Enter a numeric Unix timestamp' });
    }
  });

  it('rejects timestamps outside years 1–9999', () => {
    const tooBig = parseUnixTimestamp('253402300800001'); // ms, just past 9999-12-31
    expect(tooBig.ok).toBe(false);
    if (!tooBig.ok) expect(tooBig.error).toContain('outside the supported date range');
    const wayTooBig = parseUnixTimestamp('999999999999999'); // ms, year ~33658
    expect(wayTooBig.ok).toBe(false);
    if (!wayTooBig.ok) expect(wayTooBig.error).toContain('years 1–9999');
    const tooSmall = parseUnixTimestamp('-62135596800001'); // ms, just before year 1
    expect(tooSmall.ok).toBe(false);
    if (!tooSmall.ok) expect(tooSmall.error).toContain('years 1–9999');
  });

  it('keeps the earliest and latest supported moments in range', () => {
    expect(parseUnixTimestamp('-62135596800')).toEqual({
      ok: true,
      parsed: { ms: -62135596800000, unit: 's' },
    });
    expect(parseUnixTimestamp('253402300799999')).toEqual({
      ok: true,
      parsed: { ms: 253402300799999, unit: 'ms' },
    });
  });
});

describe('parseDateInput', () => {
  it('parses an ISO 8601 instant with Z', () => {
    expect(parseDateInput('2026-01-31T12:00:00Z')).toEqual({
      ok: true,
      ms: Date.UTC(2026, 0, 31, 12, 0, 0),
    });
  });

  it('parses date-only input as UTC midnight', () => {
    expect(parseDateInput('2026-01-31')).toEqual({ ok: true, ms: Date.UTC(2026, 0, 31) });
  });

  it('parses an explicit offset', () => {
    expect(parseDateInput('2026-01-31T12:00:00+01:00')).toEqual({
      ok: true,
      ms: Date.UTC(2026, 0, 31, 11, 0, 0),
    });
  });

  it('accepts a space instead of T (parsed as local time, like ES date-time)', () => {
    expect(parseDateInput('2026-01-31 12:00:00')).toEqual({
      ok: true,
      ms: new Date(2026, 0, 31, 12, 0, 0).getTime(),
    });
  });

  it('rejects non-ISO text', () => {
    expect(parseDateInput('not a date')).toEqual({
      ok: false,
      error: 'Could not parse the date (use ISO 8601)',
    });
    expect(parseDateInput('')).toEqual({
      ok: false,
      error: 'Could not parse the date (use ISO 8601)',
    });
  });
});

describe('relativeTime', () => {
  const now = Date.UTC(2026, 0, 31, 12, 0, 0);

  it('reports the same moment as just now', () => {
    expect(relativeTime(now, now)).toBe('just now');
    expect(relativeTime(now - 500, now)).toBe('just now');
  });

  it('pluralizes seconds and minutes', () => {
    expect(relativeTime(now - 59_000, now)).toBe('59 seconds ago');
    expect(relativeTime(now - 60_000, now)).toBe('1 minute ago');
    expect(relativeTime(now - 120_000, now)).toBe('2 minutes ago');
  });

  it('rounds 1.5 days to the day boundary', () => {
    expect(relativeTime(now - 1.5 * 86400_000, now)).toBe('2 days ago');
  });

  it('uses weeks, months and years with future phrasing', () => {
    expect(relativeTime(now + 2 * 7 * 86400_000, now)).toBe('in 2 weeks');
    expect(relativeTime(now - 40 * 86400_000, now)).toBe('1 month ago');
    expect(relativeTime(now + 400 * 86400_000, now)).toBe('in 1 year');
  });

  it('covers hour boundaries', () => {
    expect(relativeTime(now - 3_600_000, now)).toBe('1 hour ago');
    expect(relativeTime(now - 23.4 * 3_600_000, now)).toBe('23 hours ago');
  });
});

describe('describeUnixTimestamp', () => {
  it('produces deterministic fields for a fixed now', () => {
    const now = Date.UTC(2026, 0, 31, 12, 0, 0);
    const described = describeUnixTimestamp(KNOWN_MS, now);
    expect(described.isoUtc).toBe('2023-11-14T22:13:20.500Z');
    expect(described.local).toBe(new Date(KNOWN_MS).toString());
    // KNOWN_MS is roughly 2.2 years before `now` — assert the relative shape.
    expect(described.relative).toMatch(/ ago$/);
    expect(described.seconds).toBe('1,700,000,000');
    expect(described.milliseconds).toBe('1,700,000,000,500');
  });

  it('phrases near instants exactly', () => {
    const now = KNOWN_MS + 2 * 3600_000; // two hours later
    expect(describeUnixTimestamp(KNOWN_MS, now).relative).toBe('2 hours ago');
    const inThreeDays = now + 3 * 86400_000;
    expect(describeUnixTimestamp(inThreeDays, now).relative).toBe('in 3 days');
    expect(describeUnixTimestamp(now, now).relative).toBe('just now');
  });
});
