import { LIMITS } from '../shared/limits.ts';

export const PASSWORD_LIMIT = LIMITS.maxPasswordLength;

export const RANDOM_COUNT_LIMIT = LIMITS.maxRandomCount;

export interface RandomOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export const DEFAULT_RANDOM_OPTIONS: RandomOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
};

/**
 * Characters filtered out of each set when `excludeAmbiguous` is on: the
 * letter/digit pairs that look alike (`Il1O0o`) and the symbol characters
 * commonly mangled by shell quoting and line wrapping (`~|`).
 */
export const AMBIGUOUS_CHARACTERS = 'Il1O0o';
export const AMBIGUOUS_SYMBOL_CHARACTERS = '~|';

const UPPERCASE_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE_SET = 'abcdefghijklmnopqrstuvwxyz';
const DIGIT_SET = '0123456789';
const SYMBOL_SET = '!@#$%^&*()-_=+[]{}:;,.<>?~|';

/** Removes the ambiguous characters from a candidate set. */
function filterAmbiguous(set: string, symbols: boolean): string {
  const ambiguous = symbols
    ? AMBIGUOUS_CHARACTERS + AMBIGUOUS_SYMBOL_CHARACTERS
    : AMBIGUOUS_CHARACTERS;
  return set
    .split('')
    .filter((char) => !ambiguous.includes(char))
    .join('');
}

/** Builds the pooled alphabet for the options; empty when no set is enabled. */
export function characterPool(options: RandomOptions): string {
  let pool = '';
  if (options.uppercase)
    pool += options.excludeAmbiguous ? filterAmbiguous(UPPERCASE_SET, false) : UPPERCASE_SET;
  if (options.lowercase)
    pool += options.excludeAmbiguous ? filterAmbiguous(LOWERCASE_SET, false) : LOWERCASE_SET;
  if (options.digits)
    pool += options.excludeAmbiguous ? filterAmbiguous(DIGIT_SET, false) : DIGIT_SET;
  if (options.symbols)
    pool += options.excludeAmbiguous ? filterAmbiguous(SYMBOL_SET, true) : SYMBOL_SET;
  return pool;
}

/** Number of distinct characters generation can pick from (0 when none). */
export function poolSize(options: RandomOptions): number {
  return characterPool(options).length;
}

/** Entropy of a generated string in bits (length × log2(pool)); 0 when empty. */
export function entropyBits(options: RandomOptions): number {
  const size = poolSize(options);
  if (size <= 0) return 0;
  return options.length * Math.log2(size);
}

/**
 * Returns null when the options are usable, or a human-readable message:
 * length bounds first, then at least one enabled character set.
 */
export function validateRandomOptions(options: RandomOptions): string | null {
  if (!Number.isInteger(options.length) || options.length < 1 || options.length > PASSWORD_LIMIT) {
    return `Length must be between 1 and ${PASSWORD_LIMIT}`;
  }
  if (poolSize(options) === 0) {
    return 'Select at least one character set';
  }
  return null;
}

/**
 * Draws a uniform random integer in [0, max) using rejection sampling over
 * 32-bit crypto values — never a naive modulo of the raw draw, which would
 * bias the distribution.
 */
function randomIntBelow(max: number): number {
  // Largest multiple of `max` below 2^32; draws at or above it are rejected.
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const value = buffer[0];
    if (value < limit) return value % max;
  }
}

/** Generates one cryptographically secure string from the enabled sets. */
export function generateSecureString(options: RandomOptions): string {
  const validation = validateRandomOptions(options);
  if (validation) {
    throw new RangeError(validation);
  }
  const pool = characterPool(options);
  let result = '';
  for (let i = 0; i < options.length; i += 1) {
    result += pool[randomIntBelow(pool.length)];
  }
  return result;
}

/** Generates `count` independent secure strings (1–50). */
export function generateSecureStrings(count: number, options: RandomOptions): string[] {
  if (!Number.isInteger(count) || count < 1 || count > RANDOM_COUNT_LIMIT) {
    throw new RangeError(`Count must be an integer between 1 and ${RANDOM_COUNT_LIMIT}`);
  }
  const list: string[] = [];
  for (let i = 0; i < count; i += 1) list.push(generateSecureString(options));
  return list;
}
