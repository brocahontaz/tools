import { describe, expect, it } from 'vitest';
import { diffLines, diffStats, formatUnified, MAX_DIFF_LINES, type DiffRow } from './diff.ts';
import { LIMITS } from '../shared/limits.ts';

describe('diffLines', () => {
  it('marks identical texts as equal rows with both line numbers', () => {
    const result = diffLines('one\ntwo\nthree', 'one\ntwo\nthree');
    expect(result).toEqual({
      ok: true,
      rows: [
        { op: 'equal', leftLine: 1, rightLine: 1, text: 'one' },
        { op: 'equal', leftLine: 2, rightLine: 2, text: 'two' },
        { op: 'equal', leftLine: 3, rightLine: 3, text: 'three' },
      ],
    });
  });

  it('maps pure inserts to the right side only', () => {
    const result = diffLines('a\nc', 'a\nb\nc');
    if (!result.ok) throw new Error('expected ok');
    expect(result.rows).toEqual([
      { op: 'equal', leftLine: 1, rightLine: 1, text: 'a' },
      { op: 'insert', rightLine: 2, text: 'b' },
      { op: 'equal', leftLine: 2, rightLine: 3, text: 'c' },
    ]);
  });

  it('maps pure deletes to the left side only', () => {
    const result = diffLines('a\nb\nc', 'a\nc');
    if (!result.ok) throw new Error('expected ok');
    expect(result.rows).toEqual([
      { op: 'equal', leftLine: 1, rightLine: 1, text: 'a' },
      { op: 'delete', leftLine: 2, text: 'b' },
      { op: 'equal', leftLine: 3, rightLine: 2, text: 'c' },
    ]);
  });

  it('interleaves equal, delete and insert rows deterministically', () => {
    const result = diffLines('a\nx\nb', 'a\ny\nb');
    if (!result.ok) throw new Error('expected ok');
    expect(result.rows).toEqual([
      { op: 'equal', leftLine: 1, rightLine: 1, text: 'a' },
      { op: 'delete', leftLine: 2, text: 'x' },
      { op: 'insert', rightLine: 2, text: 'y' },
      { op: 'equal', leftLine: 3, rightLine: 3, text: 'b' },
    ]);
  });

  it('treats a trailing newline as an extra empty line', () => {
    const result = diffLines('a\n', 'a');
    if (!result.ok) throw new Error('expected ok');
    expect(result.rows).toEqual([
      { op: 'equal', leftLine: 1, rightLine: 1, text: 'a' },
      { op: 'delete', leftLine: 2, text: '' },
    ]);
    const mirrored = diffLines('a', 'a\n');
    if (!mirrored.ok) throw new Error('expected ok');
    expect(mirrored.rows).toEqual([
      { op: 'equal', leftLine: 1, rightLine: 1, text: 'a' },
      { op: 'insert', rightLine: 2, text: '' },
    ]);
  });

  it('handles both texts empty', () => {
    expect(diffLines('', '')).toEqual({
      ok: true,
      rows: [{ op: 'equal', leftLine: 1, rightLine: 1, text: '' }],
    });
  });

  it('rejects sides beyond the line limit', () => {
    const tooMany = 'x\n'.repeat(MAX_DIFF_LINES + 1).slice(0, -1); // 2001 lines
    const failure = diffLines(tooMany, 'ok');
    expect(failure.ok).toBe(false);
    if (!failure.ok) expect(failure.error).toContain('2,000 lines per side');
  });

  it('rejects inputs beyond the combined character limit', () => {
    const half = 'y'.repeat(LIMITS.maxDiffChars / 2 + 1);
    const failure = diffLines(half, half);
    expect(failure.ok).toBe(false);
    if (!failure.ok) expect(failure.error).toContain('50,000 characters combined');
  });
});

describe('diffStats', () => {
  it('counts added, removed and unchanged rows', () => {
    const rows: DiffRow[] = [
      { op: 'equal', leftLine: 1, rightLine: 1, text: 'a' },
      { op: 'delete', leftLine: 2, text: 'x' },
      { op: 'insert', rightLine: 2, text: 'y' },
      { op: 'insert', rightLine: 3, text: 'z' },
      { op: 'equal', leftLine: 3, rightLine: 4, text: 'b' },
    ];
    expect(diffStats(rows)).toEqual({ added: 2, removed: 1, unchanged: 2 });
  });

  it('reports zeros for an empty diff', () => {
    expect(diffStats([])).toEqual({ added: 0, removed: 0, unchanged: 0 });
  });
});

describe('formatUnified', () => {
  it('prefixes rows with -, + and two spaces', () => {
    const result = diffLines('a\nx\nb', 'a\ny\nb');
    if (!result.ok) throw new Error('expected ok');
    expect(formatUnified(result.rows)).toBe('  a\n- x\n+ y\n  b');
  });

  it('keeps empty lines distinguishable', () => {
    const result = diffLines('a\n', 'a');
    if (!result.ok) throw new Error('expected ok');
    expect(formatUnified(result.rows)).toBe('  a\n- ');
  });
});
