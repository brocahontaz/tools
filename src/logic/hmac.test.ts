import { describe, expect, it } from 'vitest';
import { hmacText, validateHmacInput } from './hmac.ts';
import { LIMITS } from '../shared/limits.ts';

describe('hmacText', () => {
  it('matches RFC 4231 test case 2 (HMAC-SHA-256, hex)', async () => {
    await expect(hmacText('what do ya want for nothing?', 'Jefe', 'SHA-256', 'hex')).resolves.toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
  });

  it('matches RFC 4231 test case 2 in base64url encoding', async () => {
    const base64url = await hmacText(
      'what do ya want for nothing?',
      'Jefe',
      'SHA-256',
      'base64url',
    );
    expect(base64url).toBe('W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM');
  });

  it('produces the expected signature length per algorithm', async () => {
    expect(await hmacText('msg', 'key', 'SHA-256', 'hex')).toHaveLength(64);
    expect(await hmacText('msg', 'key', 'SHA-384', 'hex')).toHaveLength(96);
    expect(await hmacText('msg', 'key', 'SHA-512', 'hex')).toHaveLength(128);
  });

  it('signs an empty message deterministically', async () => {
    await expect(hmacText('', 'key', 'SHA-256', 'hex')).resolves.toBe(
      '5d5d139563c95b5967b9bd9a8c9b233a9dedb45072794cd232dc1b74832607d0',
    );
  });

  it('throws on an empty secret (defensive; pages validate first)', async () => {
    await expect(hmacText('msg', '', 'SHA-256', 'hex')).rejects.toThrow(/Secret must not be empty/);
  });
});

describe('validateHmacInput', () => {
  it('returns null for a valid message and secret', () => {
    expect(validateHmacInput('hello', 's3cret')).toBeNull();
  });

  it('requires a secret', () => {
    expect(validateHmacInput('hello', '')).toBe('Enter a secret to sign the message');
    expect(validateHmacInput('hello', '   ')).toBeNull(); // non-empty, allowed
  });

  it('allows an empty message (HMAC of the empty string is valid)', () => {
    expect(validateHmacInput('', 's3cret')).toBeNull();
  });

  it('reports oversized message before the missing secret', () => {
    const big = 'a'.repeat(LIMITS.maxChars + 1);
    expect(validateHmacInput(big, '')).toContain('Input is too large');
  });

  it('reports oversized secrets', () => {
    const big = 'a'.repeat(LIMITS.maxChars + 1);
    expect(validateHmacInput('ok', big)).toContain('Input is too large');
  });
});
