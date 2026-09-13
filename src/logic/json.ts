export interface JsonParseError {
  message: string;
  line?: number;
  column?: number;
  position?: number;
}

export type JsonParseResult = { ok: true; value: unknown } | { ok: false; error: JsonParseError };

/** Maps a 0-based character position in `text` to a 1-based line/column pair. */
function lineColumnAt(text: string, position: number): { line: number; column: number } {
  const upTo = text.slice(0, Math.min(Math.max(position, 0), text.length));
  const line = (upTo.match(/\n/g)?.length ?? 0) + 1;
  const lastNewline = upTo.lastIndexOf('\n');
  const column = position - lastNewline;
  return { line, column };
}

/**
 * Strips the noisy V8 suffixes from a JSON.parse SyntaxError message and keeps
 * the readable part, e.g. `Unexpected token } in JSON at position 42 (line 1
 * column 43)` becomes `Unexpected token }`.
 */
function cleanJsonMessage(message: string): string {
  let cleaned = message
    .replace(/ \((?:line \d+ column \d+)\)$/, '')
    .replace(/ in JSON at position \d+$/, '')
    .replace(/ is not valid JSON$/, '');
  // `Unexpected token 'o', "not json" is not valid JSON` leaves the echoed
  // snippet behind — drop the trailing quoted snippet as well.
  cleaned = cleaned.replace(/, "[\s\S]*"$/, '');
  return cleaned === '' ? 'Invalid JSON' : cleaned;
}

function describeJsonSyntaxError(text: string, error: SyntaxError): JsonParseError {
  const message = cleanJsonMessage(error.message);
  const positionMatch = /\bposition (\d+)/.exec(error.message);
  if (positionMatch) {
    const position = Number.parseInt(positionMatch[1], 10);
    const { line, column } = lineColumnAt(text, position);
    return { message, line, column, position };
  }
  const lineColumnMatch = /\(line (\d+) column (\d+)\)$/.exec(error.message);
  if (lineColumnMatch) {
    return {
      message,
      line: Number.parseInt(lineColumnMatch[1], 10),
      column: Number.parseInt(lineColumnMatch[2], 10),
    };
  }
  return { message };
}

/** Parses JSON, reporting a cleaned error message with 1-based line/column when known. */
export function parseJson(text: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, error: describeJsonSyntaxError(text, error) };
    }
    return { ok: false, error: { message: 'Invalid JSON' } };
  }
}

export type JsonIndent = 2 | 4 | 'tab';

/** Pretty-prints a parsed JSON value with the given indent (2, 4 or a tab). */
export function formatJson(value: unknown, indent: JsonIndent): string {
  return JSON.stringify(value, null, indent === 'tab' ? '\t' : indent) ?? '';
}

/** Serializes a parsed JSON value on a single line. */
export function minifyJson(value: unknown): string {
  return JSON.stringify(value) ?? '';
}

function depthOf(value: unknown): number {
  if (Array.isArray(value)) {
    let max = 0;
    for (const item of value) max = Math.max(max, depthOf(item));
    return 1 + max;
  }
  if (typeof value === 'object' && value !== null) {
    let max = 0;
    for (const child of Object.values(value as Record<string, unknown>)) {
      max = Math.max(max, depthOf(child));
    }
    return 1 + max;
  }
  return 0;
}

function countKeys(value: unknown): number {
  if (Array.isArray(value)) {
    let total = 0;
    for (const item of value) total += countKeys(item);
    return total;
  }
  if (typeof value === 'object' && value !== null) {
    let total = 0;
    for (const child of Object.values(value as Record<string, unknown>)) {
      total += 1 + countKeys(child);
    }
    return total;
  }
  return 0;
}

export interface JsonStats {
  keys: number;
  /** Number of nested container (object/array) levels; 0 for scalars. */
  depth: number;
  bytes: number;
  lines: number;
}

/** Statistics over a parsed value and its formatted text (bytes via UTF-8). */
export function jsonStats(value: unknown, formatted: string): JsonStats {
  return {
    keys: countKeys(value),
    depth: depthOf(value),
    bytes: new TextEncoder().encode(formatted).length,
    lines: formatted === '' ? 0 : formatted.split('\n').length,
  };
}

/**
 * Returns a copy of the value with every object's keys sorted
 * (code-unit order). Arrays keep their order; nesting is processed deeply.
 */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysDeep(item));
  }
  if (typeof value === 'object' && value !== null) {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortKeysDeep(source[key]);
    }
    return sorted;
  }
  return value;
}
