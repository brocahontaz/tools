import { describe, expect, it } from 'vitest';
import { LIMITS, guardInput } from './limits.ts';

describe('guardInput', () => {
  it('returns null for empty input', () => {
    expect(guardInput('', LIMITS.maxChars)).toBeNull();
  });

  it('returns null within the limit', () => {
    expect(guardInput('a'.repeat(LIMITS.maxChars - 1), LIMITS.maxChars)).toBeNull();
  });

  it('returns null at the exact boundary', () => {
    expect(guardInput('a'.repeat(LIMITS.maxChars), LIMITS.maxChars)).toBeNull();
  });

  it('returns an error message one character over the limit', () => {
    const message = guardInput('a'.repeat(LIMITS.maxChars + 1), LIMITS.maxChars);
    expect(message).toContain('Input is too large');
    expect(message).toContain('100,001');
    expect(message).toContain('100,000');
  });

  it('reports the custom limit in the message', () => {
    const message = guardInput('abcdef', 5);
    expect(message).toContain('Input is too large');
    expect(message).toContain('6 of 5 characters');
  });

  it('returns null exactly at a custom limit', () => {
    expect(guardInput('abcde', 5)).toBeNull();
  });

  it('exposes the expected limit values', () => {
    expect(LIMITS).toMatchObject({
      maxChars: 100_000,
      maxJsonChars: 200_000,
      maxDiffLines: 2_000,
      maxDiffChars: 50_000,
      maxUuidCount: 100,
      maxRandomCount: 50,
      maxPasswordLength: 512,
    });
  });
});
