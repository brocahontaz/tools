import { describe, expect, it } from 'vitest';
import {
  describeLocalTime,
  formatBytes,
  formatNumberGrouped,
  formatUnixSecondsGrouped,
} from './format.ts';

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1 KiB'],
    [1536, '1.5 KiB'],
    [1048576, '1 MiB'],
  ])('formats %i as %s', (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });

  it('formats larger values with one decimal when needed', () => {
    expect(formatBytes(1_572_864)).toBe('1.5 MiB');
  });

  it('falls back to a placeholder for non-finite input', () => {
    expect(formatBytes(Number.NaN)).toBe('—');
  });
});

describe('formatNumberGrouped', () => {
  it('groups thousands with en-US separators', () => {
    expect(formatNumberGrouped(1234567)).toBe('1,234,567');
  });

  it('leaves small numbers ungrouped', () => {
    expect(formatNumberGrouped(0)).toBe('0');
    expect(formatNumberGrouped(999)).toBe('999');
  });

  it('groups negative numbers', () => {
    expect(formatNumberGrouped(-1234567)).toBe('-1,234,567');
  });
});

describe('formatUnixSecondsGrouped', () => {
  it('formats a grouped number with a unit suffix', () => {
    expect(formatUnixSecondsGrouped(1_700_000_000)).toBe('1,700,000,000 s');
  });

  it('leaves small values ungrouped', () => {
    expect(formatUnixSecondsGrouped(42)).toBe('42 s');
  });
});

describe('describeLocalTime', () => {
  it('returns the local time representation of a timestamp', () => {
    const ms = Date.UTC(2026, 0, 2, 3, 4, 5);
    expect(describeLocalTime(ms)).toBe(new Date(ms).toString());
  });
});
