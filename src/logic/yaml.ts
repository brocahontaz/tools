import { dump, load, type YAMLException } from 'js-yaml';
import { LIMITS, guardInput } from '../shared/limits.ts';
import { formatJson, parseJson } from './json.ts';

export const YAML_LIMIT = LIMITS.maxChars;

export type ConvertDirection = 'json-to-yaml' | 'yaml-to-json';

export type JsonToYamlResult = { ok: true; yaml: string } | { ok: false; error: string };
export type YamlToJsonResult = { ok: true; json: string } | { ok: false; error: string };
export type YamlConvertResult = JsonToYamlResult | YamlToJsonResult;

/**
 * Converts a thrown js-yaml error into a short message, appending the 1-based
 * line when the exception carries a mark. js-yaml messages already contain a
 * `(line:column)` suffix and a code snippet — both are dropped.
 */
function yamlErrorMessage(error: unknown): string {
  const reason =
    typeof (error as { reason?: unknown })?.reason === 'string'
      ? ((error as { reason: string }).reason as string)
      : error instanceof Error
        ? error.message
        : String(error);
  const mark = (error as YAMLException | null)?.mark;
  if (mark && typeof mark.line === 'number') {
    return `${reason} (line ${mark.line + 1})`;
  }
  return reason;
}

/** Validates raw input against the shared YAML size limit. */
export function validateYamlInput(text: string): string | null {
  return guardInput(text, YAML_LIMIT);
}

/** Converts JSON text to YAML (block style, no line folding, no anchors). */
export function jsonToYaml(text: string): JsonToYamlResult {
  const parsed = parseJson(text);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error.message };
  }
  try {
    return {
      ok: true,
      yaml: dump(parsed.value, { lineWidth: 0, noRefs: true }),
    };
  } catch (error) {
    return { ok: false, error: yamlErrorMessage(error) };
  }
}

/**
 * Converts YAML text to formatted JSON (indent 2). js-yaml's default loader
 * throws on duplicated mapping keys, which surfaces as a clean error here.
 */
export function yamlToJson(text: string): YamlToJsonResult {
  try {
    const value: unknown = load(text);
    return { ok: true, json: formatJson(value, 2) };
  } catch (error) {
    return { ok: false, error: yamlErrorMessage(error) };
  }
}

/** Direction wrapper around jsonToYaml / yamlToJson. */
export function convert(text: string, direction: ConvertDirection): YamlConvertResult {
  return direction === 'json-to-yaml' ? jsonToYaml(text) : yamlToJson(text);
}
