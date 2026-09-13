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
import { initPageShell } from '../../shared/shell.ts';
import {
  hashText,
  parseHashInput,
  type HashAlgorithm,
  type HashEncoding,
} from '../../logic/hash.ts';

initPageShell('hash');

const DEBOUNCE_MS = 300;

const els = {
  input: byId<HTMLTextAreaElement>('hash-input'),
  algorithms: {
    'SHA-256': byId<HTMLInputElement>('hash-alg-sha256'),
    'SHA-384': byId<HTMLInputElement>('hash-alg-sha384'),
    'SHA-512': byId<HTMLInputElement>('hash-alg-sha512'),
  },
  encodings: {
    hex: byId<HTMLInputElement>('hash-enc-hex'),
    base64: byId<HTMLInputElement>('hash-enc-base64'),
    base64url: byId<HTMLInputElement>('hash-enc-base64url'),
  },
  error: byId<HTMLElement>('hash-error'),
  status: byId<HTMLElement>('hash-status'),
  output: byId<HTMLPreElement>('hash-output'),
  copy: byId<HTMLButtonElement>('hash-copy'),
};

let updateSeq = 0;

function currentAlgorithm(): HashAlgorithm {
  for (const [algorithm, radio] of Object.entries(els.algorithms)) {
    if (radio.checked) return algorithm as HashAlgorithm;
  }
  return 'SHA-256';
}

function currentEncoding(): HashEncoding {
  for (const [encoding, radio] of Object.entries(els.encodings)) {
    if (radio.checked) return encoding as HashEncoding;
  }
  return 'hex';
}

async function update(): Promise<void> {
  const seq = ++updateSeq;
  const text = els.input.value;
  const parsed = parseHashInput(text);
  if (!parsed.ok) {
    showError('hash-error', parsed.error);
    setStatus('hash-status', 'Input rejected');
    return;
  }
  clearError('hash-error');
  if (text === '') {
    setTextContent(els.output, '');
    setStatus('hash-status', '');
    return;
  }
  const algorithm = currentAlgorithm();
  const encoding = currentEncoding();
  const digest = await hashText(text, algorithm, encoding);
  if (seq !== updateSeq) return; // a newer update superseded this one
  setTextContent(els.output, digest);
  setStatus('hash-status', `${algorithm} digest · ${encoding} · ${digest.length} characters`);
}

els.input.addEventListener(
  'input',
  debounce(() => void update(), DEBOUNCE_MS),
);
for (const radio of Object.values(els.algorithms)) {
  radio.addEventListener('change', () => {
    void update();
  });
}
for (const radio of Object.values(els.encodings)) {
  radio.addEventListener('change', () => void update());
}
attachCopy(els.copy, () => els.output.textContent ?? '');

void update();
