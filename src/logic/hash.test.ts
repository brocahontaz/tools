import { describe, expect, it } from 'vitest';
import { bytesToBase64Url, bytesToHex, hashText, MAX_HASH_INPUT, parseHashInput } from './hash.ts';
import { LIMITS } from '../shared/limits.ts';

describe('hashText', () => {
  it('computes the known SHA-256 of "abc" as hex', async () => {
    await expect(hashText('abc', 'SHA-256', 'hex')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('produces the expected digest length per algorithm', async () => {
    expect(await hashText('abc', 'SHA-256', 'hex')).toHaveLength(64);
    expect(await hashText('abc', 'SHA-384', 'hex')).toHaveLength(96);
    expect(await hashText('abc', 'SHA-512', 'hex')).toHaveLength(128);
  });

  it('encodes the digest as base64url without padding', async () => {
    const hex = await hashText('abc', 'SHA-256', 'hex');
    const base64url = await hashText('abc', 'SHA-256', 'base64url');
    expect(base64url).not.toMatch(/[+/=]/);
    // Independent cross-check: decode the hex to bytes, re-encode via bytesToBase64Url.
    const bytes = new Uint8Array((hex.match(/../g) ?? []).map((pair) => Number.parseInt(pair, 16)));
    expect(base64url).toBe(bytesToBase64Url(bytes));
  });

  it('encodes the digest as padded standard base64', async () => {
    const hex = await hashText('abc', 'SHA-256', 'hex');
    const base64 = await hashText('abc', 'SHA-256', 'base64');
    expect(base64).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    const bytes = new Uint8Array((hex.match(/../g) ?? []).map((pair) => Number.parseInt(pair, 16)));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    expect(base64).toBe(btoa(binary));
  });

  it('hashes the empty string deterministically', async () => {
    await expect(hashText('', 'SHA-256', 'hex')).resolves.toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

describe('encoding helpers', () => {
  it('bytesToHex pads single-digit bytes', () => {
    expect(bytesToHex(Uint8Array.of(0x00, 0x0f, 0xa1))).toBe('000fa1');
  });

  it('bytesToBase64Url strips padding and swaps the alphabet', () => {
    expect(bytesToBase64Url(Uint8Array.of(0xfb, 0xff, 0xbf))).toBe('-_-_');
    expect(bytesToBase64Url(new Uint8Array(0))).toBe('');
  });

  it('exposes the input limit from LIMITS', () => {
    expect(MAX_HASH_INPUT).toBe(LIMITS.maxChars);
  });
});

describe('parseHashInput', () => {
  it('accepts raw text and returns its UTF-8 bytes', () => {
    const result = parseHashInput('héllo');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Array.from(result.bytes)).toEqual([0x68, 0xc3, 0xa9, 0x6c, 0x6c, 0x6f]);
  });

  it('accepts the empty string', () => {
    const result = parseHashInput('');
    expect(result.ok).toBe(true);
  });

  it('rejects input over the size limit', () => {
    const result = parseHashInput('a'.repeat(MAX_HASH_INPUT + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Input is too large');
  });

  it('accepts input exactly at the limit', () => {
    expect(parseHashInput('a'.repeat(MAX_HASH_INPUT)).ok).toBe(true);
  });
});
