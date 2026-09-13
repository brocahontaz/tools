import { LIMITS } from '../shared/limits.ts';

export type DiffOp = 'equal' | 'insert' | 'delete';

export interface DiffRow {
  op: DiffOp;
  /** 1-based line number in the left (original) text; absent for inserts. */
  leftLine?: number;
  /** 1-based line number in the right (modified) text; absent for deletes. */
  rightLine?: number;
  text: string;
}

export const MAX_DIFF_LINES = LIMITS.maxDiffLines;
export const MAX_DIFF_CHARS = LIMITS.maxDiffChars;

export type DiffResult = { ok: true; rows: DiffRow[] } | { ok: false; error: string };

/**
 * Splits text into lines on `\n`. A trailing newline yields a final empty
 * line, so `a\n` and `a` differ by one empty line — visible in the diff.
 */
function splitLines(text: string): string[] {
  return text.split('\n');
}

/**
 * Line-based diff via LCS dynamic programming. Inputs are bounded (2,000
 * lines per side, 50,000 characters combined), so the (n+1)×(m+1) Int32Array
 * table stays within ~16 MB in the worst case.
 */
export function diffLines(aText: string, bText: string): DiffResult {
  const a = splitLines(aText);
  const b = splitLines(bText);
  const n = a.length;
  const m = b.length;

  if (n > MAX_DIFF_LINES || m > MAX_DIFF_LINES) {
    return {
      ok: false,
      error: `Inputs are too large to diff (max ${MAX_DIFF_LINES.toLocaleString('en-US')} lines per side)`,
    };
  }
  const combined = aText.length + bText.length;
  if (combined > MAX_DIFF_CHARS) {
    return {
      ok: false,
      error: `Inputs are too large to diff (max ${MAX_DIFF_CHARS.toLocaleString('en-US')} characters combined)`,
    };
  }

  // dp[i * (m+1) + j] = LCS length of the first i lines of a and first j of b.
  const stride = m + 1;
  const dp = new Int32Array((n + 1) * stride);
  for (let i = 1; i <= n; i += 1) {
    const rowBase = i * stride;
    const prevBase = rowBase - stride;
    for (let j = 1; j <= m; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[rowBase + j] = dp[prevBase + j - 1] + 1;
      } else {
        dp[rowBase + j] = Math.max(dp[prevBase + j], dp[rowBase + j - 1]);
      }
    }
  }

  // Backtrack from the end; on ties prefer the insert side so that, after the
  // collected rows are reversed, removed lines are listed before the inserted
  // lines that replace them.
  const rows: DiffRow[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      rows.push({ op: 'equal', leftLine: i, rightLine: j, text: a[i - 1] });
      i -= 1;
      j -= 1;
    } else if (i > 0 && (j === 0 || dp[(i - 1) * stride + j] > dp[i * stride + j - 1])) {
      rows.push({ op: 'delete', leftLine: i, text: a[i - 1] });
      i -= 1;
    } else {
      rows.push({ op: 'insert', rightLine: j, text: b[j - 1] });
      j -= 1;
    }
  }
  rows.reverse();
  return { ok: true, rows };
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

/** Counts inserted, deleted and unchanged rows. */
export function diffStats(rows: DiffRow[]): DiffStats {
  const stats: DiffStats = { added: 0, removed: 0, unchanged: 0 };
  for (const row of rows) {
    if (row.op === 'insert') stats.added += 1;
    else if (row.op === 'delete') stats.removed += 1;
    else stats.unchanged += 1;
  }
  return stats;
}

/** Unified text rendering: `- text`, `+ text` and `  text` rows. */
export function formatUnified(rows: DiffRow[]): string {
  const lines: string[] = [];
  for (const row of rows) {
    if (row.op === 'insert') lines.push(`+ ${row.text}`);
    else if (row.op === 'delete') lines.push(`- ${row.text}`);
    else lines.push(`  ${row.text}`);
  }
  return lines.join('\n');
}
