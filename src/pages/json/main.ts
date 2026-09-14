import '../../style.css';
import { attachCopy, byId, clearError, debounce, showError, setStatus } from '../../shared/dom.ts';
import { formatBytes } from '../../shared/format.ts';
import { initPageShell } from '../../shared/shell.ts';
import {
  formatJson,
  jsonStats,
  minifyJson,
  parseJson,
  sortKeysDeep,
  type JsonIndent,
} from '../../logic/json.ts';
import { LIMITS, guardInput } from '../../shared/limits.ts';

initPageShell();

const DEBOUNCE_MS = 250;

const els = {
  input: byId<HTMLTextAreaElement>('json-input'),
  indent2: byId<HTMLInputElement>('json-indent-2'),
  indent4: byId<HTMLInputElement>('json-indent-4'),
  indentTab: byId<HTMLInputElement>('json-indent-tab'),
  sortKeys: byId<HTMLInputElement>('json-sort-keys'),
  format: byId<HTMLButtonElement>('json-format'),
  minify: byId<HTMLButtonElement>('json-minify'),
  error: byId<HTMLElement>('json-error'),
  status: byId<HTMLElement>('json-status'),
  output: byId<HTMLPreElement>('json-output'),
  copy: byId<HTMLButtonElement>('json-copy'),
  stats: byId<HTMLElement>('json-stats'),
};

let outputMode: 'pretty' | 'min' = 'pretty';

function currentIndent(): JsonIndent {
  if (els.indent4.checked) return 4;
  if (els.indentTab.checked) return 'tab';
  return 2;
}

function describeError(error: { message: string; line?: number; column?: number }): string {
  if (error.line !== undefined && error.column !== undefined) {
    return `${error.message} — Line ${error.line}, Column ${error.column}`;
  }
  return error.message;
}

function update(): void {
  const text = els.input.value;
  if (text.trim() === '') {
    clearError('json-error');
    els.output.textContent = '';
    els.stats.textContent = '';
    setStatus('json-status', '');
    return;
  }

  const overLimit = guardInput(text, LIMITS.maxJsonChars);
  if (overLimit) {
    showError('json-error', overLimit);
    setStatus('json-status', 'Input rejected');
    return;
  }

  const parsed = parseJson(text);
  if (!parsed.ok) {
    showError('json-error', describeError(parsed.error));
    setStatus('json-status', 'Invalid JSON');
    return;
  }

  clearError('json-error');
  const value = els.sortKeys.checked ? sortKeysDeep(parsed.value) : parsed.value;
  const output = outputMode === 'min' ? minifyJson(value) : formatJson(value, currentIndent());
  els.output.textContent = output;

  const stats = jsonStats(parsed.value, output);
  const parts = [
    `${stats.keys.toLocaleString('en-US')} keys`,
    `depth ${stats.depth}`,
    formatBytes(stats.bytes),
    `${stats.lines.toLocaleString('en-US')} lines`,
  ];
  els.stats.textContent = parts.join(' · ');
  setStatus(
    'json-status',
    outputMode === 'min'
      ? 'Minified'
      : `Formatted (indent ${currentIndent() === 'tab' ? 'tab' : currentIndent()})`,
  );
}

els.input.addEventListener('input', debounce(update, DEBOUNCE_MS));
for (const radio of [els.indent2, els.indent4, els.indentTab]) {
  radio.addEventListener('change', () => {
    if (outputMode === 'min') outputMode = 'pretty';
    update();
  });
}
els.sortKeys.addEventListener('change', update);
els.format.addEventListener('click', () => {
  outputMode = 'pretty';
  update();
});
els.minify.addEventListener('click', () => {
  outputMode = 'min';
  update();
});
attachCopy(els.copy, () => els.output.textContent ?? '');

update();
