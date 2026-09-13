import { describe, expect, it } from 'vitest';
import { generateUuidV4, UUID_LIMIT, uppercase, uuidStats, UUID_V4_PATTERN } from './uuid.ts';

describe('generateUuidV4', () => {
  it('generates the requested number of unique, valid v4 UUIDs', () => {
    const list = generateUuidV4(5);
    expect(list).toHaveLength(5);
    expect(new Set(list).size).toBe(5);
    for (const id of list) {
      expect(id).toMatch(UUID_V4_PATTERN);
    }
  });

  it('generates a single UUID', () => {
    expect(generateUuidV4(1)).toHaveLength(1);
  });

  it('rejects counts outside 1..LIMITS.maxUuidCount', () => {
    expect(() => generateUuidV4(0)).toThrow(RangeError);
    expect(() => generateUuidV4(-3)).toThrow(RangeError);
    expect(() => generateUuidV4(1.5)).toThrow(RangeError);
    expect(() => generateUuidV4(UUID_LIMIT + 1)).toThrow(
      /Count must be an integer between 1 and 100/,
    );
  });

  it('accepts the maximum count', () => {
    expect(generateUuidV4(UUID_LIMIT)).toHaveLength(UUID_LIMIT);
  });

  it('exposes the limit from LIMITS', () => {
    expect(UUID_LIMIT).toBe(100);
  });
});

describe('uppercase', () => {
  it('upper-cases every UUID', () => {
    const list = generateUuidV4(3);
    const upper = uppercase(list);
    expect(upper).toEqual(list.map((id) => id.toUpperCase()));
    for (const id of upper) {
      expect(id).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/);
    }
  });
});

describe('uuidStats', () => {
  it('reports sane statistics for a generated list', () => {
    const list = generateUuidV4(5);
    const stats = uuidStats(list);
    expect(stats.count).toBe(5);
    expect(stats.bytesPer).toBe(36); // ASCII, 36 characters
    expect(stats.totalText).toBe(5 * 36);
    expect(stats.avgLen).toBe(36);
  });

  it('handles an empty list', () => {
    expect(uuidStats([])).toEqual({ count: 0, bytesPer: 0, totalText: 0, avgLen: 0 });
  });

  it('measures UTF-8 byte size, not character count', () => {
    const stats = uuidStats(['é']);
    expect(stats.count).toBe(1);
    expect(stats.bytesPer).toBe(2);
    expect(stats.totalText).toBe(2);
    expect(stats.avgLen).toBe(1);
  });
});
