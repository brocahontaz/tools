import { describe, expect, it } from 'vitest';
import { decodeBase64, decodeBase64Url, encodeBase64 } from './base64.ts';

describe('encodeBase64', () => {
  it('round-trips standard Base64', () => {
    const text = 'Hello, world! ✓';
    const encoded = encodeBase64(text, 'standard');
    expect(encoded).toBe('SGVsbG8sIHdvcmxkISDinJM=');
    expect(decodeBase64(encoded, 'standard')).toEqual({ ok: true, text });
  });

  it('round-trips URL-safe Base64', () => {
    const text = 'subjects?_dynamite=+/';
    const encoded = encodeBase64(text, 'url');
    expect(encoded).not.toMatch(/[+/=]/);
    expect(encoded).toMatch(/^[-_A-Za-z0-9]+$/);
    expect(decodeBase64(encoded, 'url')).toEqual({ ok: true, text });
  });

  it('produces padding-free URL-safe output for a URL-signature value', () => {
    const encoded = encodeBase64('v', 'url');
    expect(encoded).toBe('dg');
  });

  it('round-trips text whose standard Base64 needs the + and / alphabet', () => {
    // 'a' + U+00FF encodes to bytes 61 c3 bf → standard Base64 'YcO/'.
    const text = 'a\u00ff';
    const standard = encodeBase64(text, 'standard');
    expect(standard).toBe('YcO/');
    expect(decodeBase64(standard, 'standard')).toEqual({ ok: true, text });
    const url = encodeBase64(text, 'url');
    expect(url).toBe('YcO_');
    expect(decodeBase64(url, 'url')).toEqual({ ok: true, text });
    expect(decodeBase64(standard, 'url').ok).toBe(false);
  });

  it('encodes the empty string to the empty string', () => {
    expect(encodeBase64('', 'standard')).toBe('');
    expect(encodeBase64('', 'url')).toBe('');
  });
});

describe('decodeBase64', () => {
  it('strips whitespace before decoding', () => {
    expect(decodeBase64('SG Vs\nbG8g\n\tV29ybGQ=', 'standard')).toEqual({
      ok: true,
      text: 'Hello World',
    });
  });

  it('tolerates missing padding', () => {
    expect(decodeBase64('SGVsbG8', 'standard')).toEqual({ ok: true, text: 'Hello' });
    expect(decodeBase64('SGVsbG8', 'url')).toEqual({ ok: true, text: 'Hello' });
  });

  it('tolerates uppercase letters in the input', () => {
    expect(decodeBase64('SGVSbE8', 'standard')).toEqual({ ok: true, text: 'HeRlO' });
    expect(decodeBase64('aGVsbG8', 'standard')).toEqual({ ok: true, text: 'hello' });
  });

  it('rejects characters outside the selected alphabet', () => {
    expect(decodeBase64('a-b_c', 'standard').ok).toBe(false);
    expect(decodeBase64('a+b/c', 'url').ok).toBe(false);
    const failure = decodeBase64('a$&b', 'standard');
    expect(failure.ok).toBe(false);
    if (!failure.ok) expect(failure.error).toContain('not valid Base64');
  });

  it('rejects input that cannot be padded to a full block', () => {
    const failure = decodeBase64('A', 'standard');
    expect(failure.ok).toBe(false);
    if (!failure.ok) expect(failure.error).toContain('Invalid Base64 length');
  });

  it('rejects invalid padding in the middle of the input', () => {
    const failure = decodeBase64('SG=Vs', 'standard');
    expect(failure.ok).toBe(false);
  });

  it('returns ok:false for bytes that are not valid UTF-8', () => {
    const failure = decodeBase64('//4=', 'standard');
    expect(failure.ok).toBe(false);
    if (!failure.ok) expect(failure.error).toBe('Decoded bytes are not valid UTF-8');
  });

  it('decodes the empty string to the empty string', () => {
    expect(decodeBase64('', 'standard')).toEqual({ ok: true, text: '' });
    expect(decodeBase64('   ', 'url')).toEqual({ ok: true, text: '' });
  });
});

describe('decodeBase64Url', () => {
  it('returns the decoded string for valid input', () => {
    expect(decodeBase64Url('aGVsbG8')).toBe('hello');
  });

  it('throws an Error for invalid input', () => {
    expect(() => decodeBase64Url('!!!!!')).toThrow(/not valid Base64URL/);
  });
});
