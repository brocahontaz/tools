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
  hmacText,
  validateHmacInput,
  type HmacAlgorithm,
  type HmacEncoding,
} from '../../logic/hmac.ts';

initPageShell();

const DEBOUNCE_MS = 300;

const els = {
  message: byId<HTMLTextAreaElement>('hmac-message'),
  secret: byId<HTMLInputElement>('hmac-secret'),
  algorithms: {
    'SHA-256': byId<HTMLInputElement>('hmac-alg-sha256'),
    'SHA-384': byId<HTMLInputElement>('hmac-alg-sha384'),
    'SHA-512': byId<HTMLInputElement>('hmac-alg-sha512'),
  },
  encodings: {
    hex: byId<HTMLInputElement>('hmac-enc-hex'),
    base64: byId<HTMLInputElement>('hmac-enc-base64'),
    base64url: byId<HTMLInputElement>('hmac-enc-base64url'),
  },
  error: byId<HTMLElement>('hmac-error'),
  status: byId<HTMLElement>('hmac-status'),
  output: byId<HTMLPreElement>('hmac-output'),
  copy: byId<HTMLButtonElement>('hmac-copy'),
};

let updateSeq = 0;

function currentAlgorithm(): HmacAlgorithm {
  for (const [algorithm, radio] of Object.entries(els.algorithms)) {
    if (radio.checked) return algorithm as HmacAlgorithm;
  }
  return 'SHA-256';
}

function currentEncoding(): HmacEncoding {
  for (const [encoding, radio] of Object.entries(els.encodings)) {
    if (radio.checked) return encoding as HmacEncoding;
  }
  return 'hex';
}

async function update(): Promise<void> {
  const seq = ++updateSeq;
  const message = els.message.value;
  const secret = els.secret.value;
  if (message === '' && secret === '') {
    // Pristine page: guide instead of alarming.
    clearError('hmac-error');
    setTextContent(els.output, '');
    setStatus('hmac-status', 'Enter a message and a secret to sign it');
    return;
  }
  const issue = validateHmacInput(message, secret);
  if (issue) {
    showError('hmac-error', issue);
    setTextContent(els.output, '');
    setStatus('hmac-status', 'Waiting for a valid secret');
    return;
  }
  clearError('hmac-error');
  const algorithm = currentAlgorithm();
  const encoding = currentEncoding();
  const signature = await hmacText(message, secret, algorithm, encoding);
  if (seq !== updateSeq) return; // a newer update superseded this one
  setTextContent(els.output, signature);
  setStatus('hmac-status', `HMAC-${algorithm} · ${encoding} · ${signature.length} characters`);
}

for (const el of [els.message, els.secret]) {
  el.addEventListener(
    'input',
    debounce(() => void update(), DEBOUNCE_MS),
  );
}
for (const radio of Object.values(els.algorithms)) {
  radio.addEventListener('change', () => void update());
}
for (const radio of Object.values(els.encodings)) {
  radio.addEventListener('change', () => void update());
}
attachCopy(els.copy, () => els.output.textContent ?? '');

void update();
