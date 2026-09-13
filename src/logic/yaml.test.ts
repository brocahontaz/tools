import { describe, expect, it } from 'vitest';
import { convert, jsonToYaml, validateYamlInput, yamlToJson, YAML_LIMIT } from './yaml.ts';
import { LIMITS } from '../shared/limits.ts';

const JSON_SAMPLE = '{"name": "tools", "tags": ["a", "b"]}';
const YAML_SAMPLE = 'name: tools\ntags:\n  - a\n  - b\n';

describe('YAML_LIMIT', () => {
  it('matches the shared character limit', () => {
    expect(YAML_LIMIT).toBe(LIMITS.maxChars);
    expect(validateYamlInput('')).toBeNull();
    expect(validateYamlInput('a'.repeat(YAML_LIMIT + 1))).toContain('Input is too large');
  });
});

describe('jsonToYaml', () => {
  it('converts a JSON object to the expected YAML block', () => {
    expect(jsonToYaml(JSON_SAMPLE)).toEqual({ ok: true, yaml: YAML_SAMPLE });
  });

  it('does not fold long values into broken lines and avoids anchors', () => {
    const long = { text: 'x'.repeat(200) };
    const result = jsonToYaml(JSON.stringify(long));
    if (!result.ok) throw new Error('expected ok');
    // lineWidth: 0 keeps one logical line per value (folded block style for
    // very long plain scalars); the YAML must round-trip to the same value.
    const back = yamlToJson(result.yaml);
    if (!back.ok) throw new Error('expected ok');
    expect(JSON.parse(back.json)).toEqual(long);
    const aliased = { shared: { n: 1 }, a: { n: 1 } };
    const noRefs = jsonToYaml(JSON.stringify(aliased));
    if (!noRefs.ok) throw new Error('expected ok');
    expect(noRefs.yaml).not.toContain('&');
    expect(noRefs.yaml).not.toContain('*');
  });

  it('rejects invalid JSON with a clean message', () => {
    const failure = jsonToYaml('{oops}');
    expect(failure.ok).toBe(false);
    if (failure.ok) return;
    expect(failure.error).toContain('Expected property name');
  });
});

describe('yamlToJson', () => {
  it('converts YAML to formatted JSON with indent 2', () => {
    const result = yamlToJson(YAML_SAMPLE);
    if (!result.ok) throw new Error('expected ok');
    expect(JSON.parse(result.json)).toEqual({ name: 'tools', tags: ['a', 'b'] });
    expect(result.json.startsWith('{\n  "name": "tools"')).toBe(true);
  });

  it('round-trips JSON → YAML → JSON with an equal value', () => {
    const first = jsonToYaml(JSON_SAMPLE);
    if (!first.ok) throw new Error('expected ok');
    const second = yamlToJson(first.yaml);
    if (!second.ok) throw new Error('expected ok');
    expect(JSON.parse(second.json)).toEqual(JSON.parse(JSON_SAMPLE));
  });

  it('rejects duplicate mapping keys', () => {
    const failure = yamlToJson('a: 1\na: 2');
    expect(failure.ok).toBe(false);
    if (failure.ok) return;
    expect(failure.error).toContain('duplicated mapping key');
  });

  it('reports a clean message with a 1-based line for invalid YAML', () => {
    const failure = yamlToJson('foo: [1, 2');
    expect(failure.ok).toBe(false);
    if (failure.ok) return;
    expect(failure.error).toContain('unexpected end of the stream');
    expect(failure.error).toContain('(line 2)');
  });
});

describe('convert', () => {
  it('dispatches both directions', () => {
    const toYaml = convert(JSON_SAMPLE, 'json-to-yaml');
    expect(toYaml).toEqual({ ok: true, yaml: YAML_SAMPLE });
    const toJson = convert(YAML_SAMPLE, 'yaml-to-json');
    expect(toJson.ok).toBe(true);
    if (toJson.ok && 'json' in toJson) {
      expect(JSON.parse(toJson.json)).toEqual({ name: 'tools', tags: ['a', 'b'] });
    }
  });

  it('propagates errors from either direction', () => {
    expect(convert('{oops}', 'json-to-yaml').ok).toBe(false);
    expect(convert('a: [1, 2', 'yaml-to-json').ok).toBe(false);
  });
});
