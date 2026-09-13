import { describe, expect, it } from 'vitest';
import {
  AMBIGUOUS_CHARACTERS,
  characterPool,
  DEFAULT_RANDOM_OPTIONS,
  entropyBits,
  generateSecureString,
  generateSecureStrings,
  PASSWORD_LIMIT,
  poolSize,
  RANDOM_COUNT_LIMIT,
  validateRandomOptions,
  type RandomOptions,
} from './random.ts';
import { LIMITS } from '../shared/limits.ts';

function options(overrides: Partial<RandomOptions>): RandomOptions {
  return { ...DEFAULT_RANDOM_OPTIONS, ...overrides };
}

describe('limits', () => {
  it('exposes the shared limits', () => {
    expect(PASSWORD_LIMIT).toBe(LIMITS.maxPasswordLength);
    expect(RANDOM_COUNT_LIMIT).toBe(LIMITS.maxRandomCount);
    expect(DEFAULT_RANDOM_OPTIONS.length).toBe(20);
  });
});

describe('poolSize', () => {
  it('counts the enabled sets', () => {
    expect(poolSize(options({}))).toBe(26 + 26 + 10 + 27); // symbols = 27 characters
    expect(poolSize(options({ uppercase: false, lowercase: false }))).toBe(10 + 27);
    expect(
      poolSize(options({ uppercase: false, lowercase: false, digits: false, symbols: false })),
    ).toBe(0);
  });

  it('filters ambiguous characters when asked', () => {
    const plain = options({});
    const filtered = options({ excludeAmbiguous: true });
    expect(poolSize(filtered)).toBe(poolSize(plain) - 6 - 2); // Il1O0o plus ~|
    expect(characterPool(filtered)).not.toMatch(/[Il1O0o]/);
    expect(characterPool(filtered)).not.toMatch(/[~|]/);
    expect(AMBIGUOUS_CHARACTERS).toBe('Il1O0o');
  });

  it('keeps ~ and | when ambiguity filtering is off', () => {
    expect(characterPool(options({ symbols: true }))).toMatch(/[~|]/);
  });
});

describe('entropyBits', () => {
  it('equals length × log2(pool) for known options', () => {
    expect(entropyBits(options({ length: 20 }))).toBeCloseTo(20 * Math.log2(89), 10);
    expect(entropyBits(options({ length: 16, symbols: false }))).toBeCloseTo(
      16 * Math.log2(62),
      10,
    );
    expect(
      entropyBits(
        options({ length: 12, uppercase: false, lowercase: false, symbols: false, digits: true }),
      ),
    ).toBeCloseTo(12 * Math.log2(10), 10);
  });

  it('is 0 when the pool is empty', () => {
    expect(
      entropyBits(options({ uppercase: false, lowercase: false, digits: false, symbols: false })),
    ).toBe(0);
  });
});

describe('validateRandomOptions', () => {
  it('returns null for valid options', () => {
    expect(validateRandomOptions(options({}))).toBeNull();
    expect(validateRandomOptions(options({ length: 1, symbols: false, digits: true }))).toBeNull();
  });

  it('rejects an empty pool', () => {
    expect(
      validateRandomOptions(
        options({ uppercase: false, lowercase: false, digits: false, symbols: false }),
      ),
    ).toBe('Select at least one character set');
  });

  it('rejects out-of-range lengths', () => {
    expect(validateRandomOptions(options({ length: 0 }))).toBe('Length must be between 1 and 512');
    expect(validateRandomOptions(options({ length: 513 }))).toBe(
      'Length must be between 1 and 512',
    );
    expect(validateRandomOptions(options({ length: 12.5 }))).toBe(
      'Length must be between 1 and 512',
    );
  });
});

describe('generateSecureString', () => {
  it('produces strings of the requested length from the expected pool', () => {
    const opts = options({ length: 32, excludeAmbiguous: true });
    const allowed = characterPool(opts);
    for (let i = 0; i < 200; i += 1) {
      const value = generateSecureString(opts);
      expect(value).toHaveLength(32);
      for (const char of value) {
        expect(allowed).toContain(char);
      }
    }
  });

  it('respects each enabled set over many draws', () => {
    const opts = options({ length: 64 });
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      for (const char of generateSecureString(opts)) seen.add(char);
    }
    // With a 88-character pool and 3200 draws, every character should appear.
    expect(seen.size).toBe(poolSize(opts));
  });

  it('generates digits-only output when only digits are enabled', () => {
    const opts = options({ length: 20, uppercase: false, lowercase: false, symbols: false });
    for (let i = 0; i < 20; i += 1) {
      expect(generateSecureString(opts)).toMatch(/^\d{20}$/);
    }
  });

  it('throws for invalid options', () => {
    expect(() => generateSecureString(options({ length: 0 }))).toThrow(RangeError);
    expect(() => generateSecureString(options({ length: PASSWORD_LIMIT + 1 }))).toThrow(RangeError);
    expect(() =>
      generateSecureString(
        options({ uppercase: false, lowercase: false, digits: false, symbols: false }),
      ),
    ).toThrow(/Select at least one character set/);
  });
});

describe('generateSecureStrings', () => {
  it('returns the requested count of unique strings', () => {
    const list = generateSecureStrings(5, options({ length: 24 }));
    expect(list).toHaveLength(5);
    expect(new Set(list).size).toBe(5);
    for (const value of list) expect(value).toHaveLength(24);
  });

  it('honours the count bounds', () => {
    expect(() => generateSecureStrings(0, options({}))).toThrow(RangeError);
    expect(() => generateSecureStrings(RANDOM_COUNT_LIMIT + 1, options({}))).toThrow(RangeError);
    expect(generateSecureStrings(RANDOM_COUNT_LIMIT, options({ length: 8 }))).toHaveLength(
      RANDOM_COUNT_LIMIT,
    );
  });
});
