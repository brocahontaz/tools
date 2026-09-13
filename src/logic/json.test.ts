import { describe, expect, it } from 'vitest';
import { formatJson, jsonStats, minifyJson, parseJson, sortKeysDeep } from './json.ts';

describe('parseJson', () => {
  it('parses valid JSON', () => {
    expect(parseJson('{"a": 1}')).toEqual({ ok: true, value: { a: 1 } });
    expect(parseJson('[1, 2, 3]')).toEqual({ ok: true, value: [1, 2, 3] });
    expect(parseJson('"text"')).toEqual({ ok: true, value: 'text' });
    expect(parseJson('null')).toEqual({ ok: true, value: null });
  });

  it('round-trips through formatJson and minifyJson', () => {
    const source = '{"name":"tools","tags":["a","b"],"nested":{"on":true,"n":null}}';
    const parsed = parseJson(source);
    if (!parsed.ok) throw new Error('expected ok');
    const formatted = formatJson(parsed.value, 2);
    expect(formatted).toBe(
      '{\n  "name": "tools",\n  "tags": [\n    "a",\n    "b"\n  ],\n  "nested": {\n    "on": true,\n    "n": null\n  }\n}',
    );
    expect(parseJson(formatted)).toEqual(parsed);
    expect(parseJson(minifyJson(parsed.value))).toEqual(parsed);
  });

  it('reports a clean message with line/column for a trailing comma', () => {
    const failure = parseJson('{"a": 1,}');
    expect(failure.ok).toBe(false);
    if (failure.ok) return;
    expect(failure.error.message).toBe('Expected double-quoted property name');
    expect(failure.error.position).toBe(8);
    expect(failure.error.line).toBe(1);
    expect(failure.error.column).toBe(9);
  });

  it('maps a multi-line syntax error to the correct line and column', () => {
    const failure = parseJson('{\n  "a": 1,\n  "bad"\n}');
    expect(failure.ok).toBe(false);
    if (failure.ok) return;
    // V8 points at position 20 — the closing `}` on line 4, column 1.
    expect(failure.error.position).toBe(20);
    expect(failure.error.line).toBe(4);
    expect(failure.error.column).toBe(1);
    expect(failure.error.message).not.toContain('at position');
  });

  it('keeps the position without line/column when none can be derived', () => {
    // `Unexpected end of JSON input` carries no position on some inputs.
    const failure = parseJson('{"a":');
    expect(failure.ok).toBe(false);
    if (failure.ok) return;
    expect(failure.error.message.length).toBeGreaterThan(0);
    expect(failure.error.message).not.toMatch(/in JSON at position/);
  });

  it('cleans the echoed-snippet form of the V8 message', () => {
    const failure = parseJson('not json');
    expect(failure.ok).toBe(false);
    if (failure.ok) return;
    expect(failure.error.message).toBe("Unexpected token 'o'");
    expect(failure.error.message).not.toContain('is not valid JSON');
  });
});

describe('formatJson / minifyJson', () => {
  it('formats with each indent option', () => {
    const value = { a: { b: 1 } };
    expect(formatJson(value, 2)).toBe('{\n  "a": {\n    "b": 1\n  }\n}');
    expect(formatJson(value, 4)).toBe('{\n    "a": {\n        "b": 1\n    }\n}');
    expect(formatJson(value, 'tab')).toBe('{\n\t"a": {\n\t\t"b": 1\n\t}\n}');
  });

  it('minifies to a single line', () => {
    expect(minifyJson({ a: [1, 2] })).toBe('{"a":[1,2]}');
    expect(minifyJson([])).toBe('[]');
  });
});

describe('sortKeysDeep', () => {
  it('sorts object keys at every level and preserves array order', () => {
    const value = { b: 1, a: { d: 4, c: [{ z: 1, y: 2 }] } };
    expect(sortKeysDeep(value)).toEqual({
      a: { c: [{ y: 2, z: 1 }], d: 4 },
      b: 1,
    });
  });

  it('does not mutate the input', () => {
    const value = { b: 1, a: 2 };
    sortKeysDeep(value);
    expect(Object.keys(value)).toEqual(['b', 'a']);
  });

  it('leaves scalars and arrays of scalars untouched', () => {
    expect(sortKeysDeep(3)).toBe(3);
    expect(sortKeysDeep(null)).toBeNull();
    expect(sortKeysDeep(['b', 'a'])).toEqual(['b', 'a']);
  });
});

describe('jsonStats', () => {
  it('counts keys, depth, bytes and lines', () => {
    const value = { a: 1, b: { c: [1, 2] } };
    const formatted = formatJson(value, 2);
    const stats = jsonStats(value, formatted);
    expect(stats.keys).toBe(3);
    expect(stats.depth).toBe(3);
    expect(stats.lines).toBe(formatted.split('\n').length);
    expect(stats.bytes).toBe(new TextEncoder().encode(formatted).length);
  });

  it('reports zero depth and keys for scalars', () => {
    expect(jsonStats(7, '7')).toEqual({ keys: 0, depth: 0, bytes: 1, lines: 1 });
    expect(jsonStats(null, 'null')).toEqual({ keys: 0, depth: 0, bytes: 4, lines: 1 });
  });

  it('reports an empty container as one level with no keys', () => {
    expect(jsonStats({}, '{}')).toEqual({ keys: 0, depth: 1, bytes: 2, lines: 1 });
  });
});
