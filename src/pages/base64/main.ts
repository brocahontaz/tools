import '../../style.css';
import {
  attachCopy,
  byId,
  clearError,
  showError,
  setStatus,
  setTextContent,
} from '../../shared/dom.ts';
import { formatBytes } from '../../shared/format.ts';
import { LIMITS, guardInput } from '../../shared/limits.ts';
import { initPageShell } from '../../shared/shell.ts';
import { decodeBase64, encodeBase64, type Base64Variant } from '../../logic/base64.ts';

initPageShell();

const els = {
  input: byId<HTMLTextAreaElement>('base64-input'),
  variantStandard: byId<HTMLInputElement>('base64-variant-standard'),
  variantUrl: byId<HTMLInputElement>('base64-variant-url'),
  encode: byId<HTMLButtonElement>('encode-btn'),
  decode: byId<HTMLButtonElement>('decode-btn'),
  swap: byId<HTMLButtonElement>('swap-btn'),
  error: byId<HTMLElement>('base64-error'),
  status: byId<HTMLElement>('base64-status'),
  output: byId<HTMLPreElement>('base64-output'),
  copy: byId<HTMLButtonElement>('base64-copy'),
  meta: byId<HTMLElement>('base64-meta'),
};

function currentVariant(): Base64Variant {
  return els.variantUrl.checked ? 'url' : 'standard';
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function showResult(text: string, summary: string): void {
  clearError('base64-error');
  setTextContent(els.output, text === '' ? '—' : text);
  els.meta.textContent = `Input: ${formatBytes(byteLength(els.input.value))} · Output: ${formatBytes(
    byteLength(text),
  )}`;
  setStatus('base64-status', summary);
}

function guardOversizedInput(): boolean {
  const guard = guardInput(els.input.value, LIMITS.maxChars);
  if (guard) {
    showError('base64-error', guard);
    setStatus('base64-status', 'Input too large');
    return true;
  }
  return false;
}

function onEncode(): void {
  if (guardOversizedInput()) return;
  const encoded = encodeBase64(els.input.value, currentVariant());
  showResult(encoded, `Encoded to Base64${currentVariant() === 'url' ? 'URL' : ''}`);
}

function onDecode(): void {
  if (guardOversizedInput()) return;
  const result = decodeBase64(els.input.value, currentVariant());
  if (!result.ok) {
    showError('base64-error', result.error);
    setStatus('base64-status', 'Decode failed');
    return;
  }
  showResult(result.text, 'Decoded from Base64');
}

function onSwap(): void {
  const output = els.output.textContent ?? '';
  if (output === '—' || output === '') {
    setStatus('base64-status', 'Nothing to move');
    return;
  }
  els.input.value = output;
  setTextContent(els.output, '—');
  els.meta.textContent = '';
  setStatus('base64-status', 'Moved output to input');
}

els.encode.addEventListener('click', onEncode);
els.decode.addEventListener('click', onDecode);
els.swap.addEventListener('click', onSwap);
for (const radio of [els.variantStandard, els.variantUrl]) {
  radio.addEventListener('change', () => {
    setStatus('base64-status', `Variant: ${currentVariant() === 'url' ? 'URL-safe' : 'standard'}`);
  });
}
attachCopy(els.copy, () => {
  const text = els.output.textContent ?? '';
  return text === '—' ? '' : text;
});
