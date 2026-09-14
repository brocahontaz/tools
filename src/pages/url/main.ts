import '../../style.css';
import {
  attachCopy,
  byId,
  clearError,
  debounce,
  showError,
  setStatus,
  setTextContent,
} from '../../shared/dom.ts';
import { initPageShell } from '../../shared/shell.ts';
import { LIMITS, guardInput } from '../../shared/limits.ts';
import { decodeUrl, encodeUrl, urlParts, type UrlMode, type UrlParts } from '../../logic/url.ts';

initPageShell();

const DEBOUNCE_MS = 250;

const PART_FIELDS: ReadonlyArray<[keyof UrlParts, string]> = [
  ['protocol', 'Protocol'],
  ['credentials', 'Credentials'],
  ['host', 'Host'],
  ['port', 'Port'],
  ['pathname', 'Path'],
  ['search', 'Query'],
  ['hash', 'Fragment'],
  ['origin', 'Origin'],
];

const els = {
  input: byId<HTMLTextAreaElement>('url-input'),
  modeComponent: byId<HTMLInputElement>('url-mode-component'),
  modeFull: byId<HTMLInputElement>('url-mode-full'),
  encode: byId<HTMLButtonElement>('url-encode'),
  decode: byId<HTMLButtonElement>('url-decode'),
  error: byId<HTMLElement>('url-error'),
  status: byId<HTMLElement>('url-status'),
  output: byId<HTMLPreElement>('url-output'),
  copy: byId<HTMLButtonElement>('url-copy'),
  partsCard: byId<HTMLElement>('url-parts-card'),
  parts: byId<HTMLDivElement>('url-parts'),
  partsNote: byId<HTMLElement>('url-parts-note'),
};

function currentMode(): UrlMode {
  return els.modeFull.checked ? 'full' : 'component';
}

function guardOversizedInput(): boolean {
  const guard = guardInput(els.input.value, LIMITS.maxChars);
  if (guard) {
    showError('url-error', guard);
    setStatus('url-status', 'Input too large');
    return true;
  }
  return false;
}

function onEncode(): void {
  if (guardOversizedInput()) return;
  const encoded = encodeUrl(els.input.value, currentMode());
  clearError('url-error');
  setTextContent(els.output, encoded === '' ? '—' : encoded);
  setStatus(
    'url-status',
    `Encoded (${currentMode() === 'full' ? 'full URL' : 'component'}) · ${encoded.length} characters`,
  );
}

function onDecode(): void {
  if (guardOversizedInput()) return;
  const result = decodeUrl(els.input.value, currentMode());
  if (!result.ok) {
    showError('url-error', result.error);
    setStatus('url-status', 'Decode failed');
    return;
  }
  clearError('url-error');
  setTextContent(els.output, result.text === '' ? '—' : result.text);
  setStatus(
    'url-status',
    `Decoded (${currentMode() === 'full' ? 'full URL' : 'component'}) · ${result.text.length} characters`,
  );
}

function appendPartRow(key: string, value: string): void {
  const row = document.createElement('div');
  row.className = 'kv-row';
  const keyEl = document.createElement('div');
  keyEl.className = 'kv-key';
  keyEl.textContent = key;
  const valueEl = document.createElement('div');
  valueEl.className = 'kv-value';
  valueEl.textContent = value;
  row.append(keyEl, valueEl);
  els.parts.append(row);
}

function renderParts(text: string): void {
  els.parts.replaceChildren();
  els.partsNote.hidden = true;
  els.parts.hidden = false;
  if (text.trim() === '') {
    els.partsNote.textContent = 'Enter an absolute URL to inspect its parts';
    els.partsNote.hidden = false;
    els.parts.hidden = true;
    return;
  }
  const parts = urlParts(text);
  if ('error' in parts) {
    els.partsNote.textContent = parts.error;
    els.partsNote.hidden = false;
    els.parts.hidden = true;
    return;
  }
  for (const [field, label] of PART_FIELDS) {
    appendPartRow(label, parts[field] ?? '—');
  }
}

els.encode.addEventListener('click', onEncode);
els.decode.addEventListener('click', onDecode);
for (const radio of [els.modeComponent, els.modeFull]) {
  radio.addEventListener('change', () => {
    setStatus('url-status', `Mode: ${currentMode() === 'full' ? 'full URL' : 'component'}`);
  });
}
els.input.addEventListener(
  'input',
  debounce(() => renderParts(els.input.value), DEBOUNCE_MS),
);
attachCopy(els.copy, () => {
  const text = els.output.textContent ?? '';
  return text === '—' ? '' : text;
});

renderParts('');
