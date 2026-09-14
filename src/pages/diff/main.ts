import '../../style.css';
import {
  attachCopy,
  byId,
  clearError,
  debounce,
  setStatus,
  setTextContent,
  showError,
} from '../../shared/dom.ts';
import { formatNumberGrouped } from '../../shared/format.ts';
import { initPageShell } from '../../shared/shell.ts';
import { diffLines, diffStats, formatUnified, type DiffRow } from '../../logic/diff.ts';

initPageShell();

const DEBOUNCE_MS = 300;

const els = {
  left: byId<HTMLTextAreaElement>('diff-left'),
  right: byId<HTMLTextAreaElement>('diff-right'),
  viewUnified: byId<HTMLInputElement>('diff-view-unified'),
  viewSplit: byId<HTMLInputElement>('diff-view-split'),
  limit: byId<HTMLElement>('diff-limit'),
  status: byId<HTMLElement>('diff-status'),
  stats: byId<HTMLElement>('diff-stats'),
  output: byId<HTMLPreElement>('diff-output'),
  split: byId<HTMLDivElement>('diff-split'),
  copy: byId<HTMLButtonElement>('diff-copy'),
};

let lastRows: DiffRow[] = [];

function appendLine(container: HTMLElement, className: string, text: string): void {
  const line = document.createElement('span');
  line.className = className;
  line.textContent = text;
  container.append(line);
}

function renderUnified(rows: DiffRow[]): void {
  els.output.replaceChildren();
  for (const row of rows) {
    const marker = row.op === 'insert' ? '+' : row.op === 'delete' ? '-' : ' ';
    const className =
      row.op === 'insert'
        ? 'diff-line diff-add'
        : row.op === 'delete'
          ? 'diff-line diff-del'
          : 'diff-line diff-ctx';
    appendLine(els.output, className, `${marker} ${row.text}`);
  }
}

function appendCell(rowClass: string, lineNum: number | undefined, text: string | null): void {
  const cell = document.createElement('div');
  cell.className = `diff-cell ${rowClass}`;
  const num = document.createElement('span');
  num.className = 'diff-line-num';
  num.textContent = lineNum === undefined ? '' : String(lineNum);
  const textEl = document.createElement('span');
  textEl.className = 'diff-line';
  textEl.textContent = text ?? ' ';
  cell.append(num, textEl);
  els.split.append(cell);
}

function renderSplit(rows: DiffRow[]): void {
  els.split.replaceChildren();
  for (const row of rows) {
    if (row.op === 'equal') {
      appendCell('diff-ctx', row.leftLine, row.text);
      appendCell('diff-ctx', row.rightLine, row.text);
    } else if (row.op === 'delete') {
      appendCell('diff-del', row.leftLine, row.text);
      appendCell('diff-del', undefined, null);
    } else {
      appendCell('diff-add', undefined, null);
      appendCell('diff-add', row.rightLine, row.text);
    }
  }
}

function update(): void {
  const aText = els.left.value;
  const bText = els.right.value;
  if (aText === '' && bText === '') {
    clearError('diff-limit');
    setTextContent(els.output, '');
    els.split.replaceChildren();
    els.stats.textContent = '';
    setStatus('diff-status', '');
    lastRows = [];
    return;
  }

  const result = diffLines(aText, bText);
  if (!result.ok) {
    showError('diff-limit', result.error);
    setStatus('diff-status', 'Input too large');
    lastRows = [];
    return;
  }

  clearError('diff-limit');
  lastRows = result.rows;
  const stats = diffStats(lastRows);
  els.stats.textContent =
    `+${formatNumberGrouped(stats.added)} added · -${formatNumberGrouped(stats.removed)} removed · ` +
    `${formatNumberGrouped(stats.unchanged)} unchanged`;
  renderUnified(lastRows);
  renderSplit(lastRows);
  toggleView();
  setStatus('diff-status', 'Diff computed');
}

function toggleView(): void {
  const split = els.viewSplit.checked;
  els.output.hidden = split;
  els.split.hidden = !split;
}

els.left.addEventListener('input', debounce(update, DEBOUNCE_MS));
els.right.addEventListener('input', debounce(update, DEBOUNCE_MS));
els.viewUnified.addEventListener('change', toggleView);
els.viewSplit.addEventListener('change', toggleView);
attachCopy(els.copy, () => formatUnified(lastRows));

update();
