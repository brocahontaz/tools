import { describe, expect, it } from 'vitest';
import { decodeJwt, formatJwtTimestamps, JWT_ALGORITHM_NOTE, namedJwtClaims } from './jwt.ts';
import { encodeBase64 } from './base64.ts';

const REAL_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

describe('decodeJwt', () => {
  it('decodes a real HS256 token', () => {
    const result = decodeJwt(REAL_TOKEN);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { decoded } = result;
    expect(decoded.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(decoded.payload).toEqual({ sub: '1234567890' });
    expect(decoded.headerJson).toBe('{"alg":"HS256","typ":"JWT"}');
    expect(decoded.payloadJson).toBe('{"sub":"1234567890"}');
    expect(decoded.signature).toBe('dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
    expect(decoded.segments.map((segment) => segment.name)).toEqual([
      'header',
      'payload',
      'signature',
    ]);
    expect(decoded.segments[0]).toEqual({
      name: 'header',
      raw: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      json: '{"alg":"HS256","typ":"JWT"}',
    });
    expect(decoded.segments[2].json).toBeNull();
  });

  it('rejects tokens with the wrong number of segments', () => {
    const twoSegments = decodeJwt('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0');
    expect(twoSegments.ok).toBe(false);
    if (!twoSegments.ok) expect(twoSegments.error).toBe('Expected 3 dot-separated segments, got 2');

    const fourSegments = decodeJwt('a.b.c.d');
    expect(fourSegments.ok).toBe(false);
    if (!fourSegments.ok)
      expect(fourSegments.error).toBe('Expected 3 dot-separated segments, got 4');
  });

  it('rejects a payload that is valid base64url but not JSON', () => {
    const token = ['eyJhbGciOiJIUzI1NiJ9', encodeBase64('not json', 'url'), 'sig'].join('.');
    const result = decodeJwt(token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Payload is not valid JSON');
  });

  it('rejects a header that is not JSON', () => {
    const token = [encodeBase64('plain', 'url'), encodeBase64('{}', 'url'), 'sig'].join('.');
    const result = decodeJwt(token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Header is not valid JSON');
  });

  it('rejects undecodable segments', () => {
    const result = decodeJwt('!!!.eyJzdWIiOiIxIn0.sig');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Failed to decode header');
  });

  it('tolerates surrounding whitespace', () => {
    const result = decodeJwt(`  ${REAL_TOKEN}\n`);
    expect(result.ok).toBe(true);
  });

  it('exposes the no-verification note', () => {
    expect(JWT_ALGORITHM_NOTE).toContain('does not verify');
  });
});

describe('formatJwtTimestamps', () => {
  it('returns no rows when the payload has no timestamp claims', () => {
    const result = decodeJwt(REAL_TOKEN);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(formatJwtTimestamps(result.decoded)).toEqual([]);
  });

  it('formats iat and exp with local time and relative seconds for exp', () => {
    const iat = 1_700_000_000;
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const header = encodeBase64('{"alg":"HS256"}', 'url');
    const payload = encodeBase64(JSON.stringify({ iat, exp }), 'url');
    const result = decodeJwt([header, payload, 'sig'].join('.'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const rows = formatJwtTimestamps(result.decoded);
    expect(rows.map((row) => row.key)).toEqual(['iat', 'exp']);
    expect(rows[0]).toMatchObject({ key: 'iat', value: iat });
    expect(rows[0].relativeSeconds).toBeUndefined();
    expect(rows[0].local).toBe(new Date(iat * 1000).toString());
    expect(rows[1].key).toBe('exp');
    expect(rows[1].relativeSeconds).toBeGreaterThanOrEqual(3599);
    expect(rows[1].relativeSeconds).toBeLessThanOrEqual(3601);
  });

  it('reports negative relative seconds for an expired exp', () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    const header = encodeBase64('{"alg":"HS256"}', 'url');
    const payload = encodeBase64(JSON.stringify({ exp }), 'url');
    const result = decodeJwt([header, payload, 'sig'].join('.'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rows = formatJwtTimestamps(result.decoded);
    expect(rows).toHaveLength(1);
    expect(rows[0].relativeSeconds).toBeLessThanOrEqual(-59);
  });

  it('ignores non-numeric timestamp claims', () => {
    const header = encodeBase64('{"alg":"HS256"}', 'url');
    const payload = encodeBase64(JSON.stringify({ iat: 'yesterday', nbf: 12 }), 'url');
    const result = decodeJwt([header, payload, 'sig'].join('.'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rows = formatJwtTimestamps(result.decoded);
    expect(rows.map((row) => row.key)).toEqual(['nbf']);
    expect(rows[0].relativeSeconds).toBeUndefined();
  });
});

describe('namedJwtClaims', () => {
  it('lists header alg/typ and payload sub/iss/aud in order', () => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = { sub: 'user-1', iss: 'https://issuer.example', aud: 'api://default' };
    expect(namedJwtClaims(header, payload)).toEqual([
      { key: 'alg', value: 'HS256' },
      { key: 'typ', value: 'JWT' },
      { key: 'sub', value: 'user-1' },
      { key: 'iss', value: 'https://issuer.example' },
      { key: 'aud', value: 'api://default' },
    ]);
  });

  it('formats an aud claim given as an array of strings as JSON', () => {
    const payload = { aud: ['api://a', 'api://b'] };
    expect(namedJwtClaims(null, payload)).toEqual([{ key: 'aud', value: '["api://a","api://b"]' }]);
  });

  it('skips missing claims and returns no rows for null segments', () => {
    expect(namedJwtClaims({ typ: 'JWT' }, { aud: 'x' })).toEqual([
      { key: 'typ', value: 'JWT' },
      { key: 'aud', value: 'x' },
    ]);
    expect(namedJwtClaims(null, null)).toEqual([]);
  });

  it('formats non-string claim values as JSON', () => {
    const payload = { sub: 12_345, iss: { id: 1 } };
    expect(namedJwtClaims(null, payload)).toEqual([
      { key: 'sub', value: '12345' },
      { key: 'iss', value: '{"id":1}' },
    ]);
  });
});
