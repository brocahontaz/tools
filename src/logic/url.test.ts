import { describe, expect, it } from 'vitest';
import { decodeUrl, encodeUrl, urlParts } from './url.ts';

describe('encodeUrl', () => {
  it('encodes component mode with encodeURIComponent semantics', () => {
    expect(encodeUrl('https://example.com/a b?x=1&y=2#z', 'component')).toBe(
      'https%3A%2F%2Fexample.com%2Fa%20b%3Fx%3D1%26y%3D2%23z',
    );
  });

  it('encodes full mode with encodeURI semantics', () => {
    expect(encodeUrl('https://example.com/a b?x=1&y=2#z', 'full')).toBe(
      'https://example.com/a%20b?x=1&y=2#z',
    );
  });

  it('keeps reserved URL characters in full mode but escapes them in component mode', () => {
    expect(encodeUrl('?a=/&b=', 'full')).toBe('?a=/&b=');
    expect(encodeUrl('?a=/&b=', 'component')).toBe('%3Fa%3D%2F%26b%3D');
  });
});

describe('decodeUrl', () => {
  it('round-trips component mode', () => {
    const original = 'a b/c?d=e&f#g+h';
    const encoded = encodeUrl(original, 'component');
    expect(decodeUrl(encoded, 'component')).toEqual({ ok: true, text: original });
  });

  it('round-trips full mode', () => {
    const original = 'https://example.com/a%20b?x=%31#top';
    expect(decodeUrl(original, 'full')).toEqual({
      ok: true,
      text: 'https://example.com/a b?x=1#top',
    });
  });

  it('reports malformed percent-encoding as a failure', () => {
    const failure = decodeUrl('%E0%A4%A', 'component');
    expect(failure.ok).toBe(false);
    if (!failure.ok) expect(failure.error).toBe('Malformed percent-encoding');
    expect(decodeUrl('100%', 'full').ok).toBe(false);
  });

  it('decodes the empty string to the empty string', () => {
    expect(decodeUrl('', 'component')).toEqual({ ok: true, text: '' });
  });
});

describe('urlParts', () => {
  it('splits an absolute URL with credentials, port, path, query and hash', () => {
    const parts = urlParts('https://user:pw@example.com:8443/a/b?x=1#frag');
    expect('error' in parts).toBe(false);
    expect(parts).toEqual({
      protocol: 'https:',
      host: 'example.com:8443',
      port: '8443',
      pathname: '/a/b',
      search: '?x=1',
      hash: '#frag',
      origin: 'https://example.com:8443',
      credentials: 'user:pw',
    });
  });

  it('returns null for absent components', () => {
    const parts = urlParts('https://example.com');
    expect(parts).toEqual({
      protocol: 'https:',
      host: 'example.com',
      port: null,
      pathname: '/',
      search: null,
      hash: null,
      origin: 'https://example.com',
      credentials: null,
    });
  });

  it('rejects relative input with guidance', () => {
    const failure = urlParts('/just/a/path?x=1');
    expect('error' in failure).toBe(true);
    if ('error' in failure)
      expect(failure.error).toBe('Enter an absolute URL to inspect its parts');
  });

  it('rejects malformed absolute URLs', () => {
    const failure = urlParts('https://exa mple.com');
    expect('error' in failure).toBe(true);
    if ('error' in failure)
      expect(failure.error).toBe('Enter an absolute URL to inspect its parts');
  });
});
