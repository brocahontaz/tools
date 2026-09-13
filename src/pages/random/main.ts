import '../../style.css';
import { attachCopy, byId, clearError, showError, setStatus } from '../../shared/dom.ts';
import { initPageShell } from '../../shared/shell.ts';
import {
  entropyBits,
  generateSecureStrings,
  PASSWORD_LIMIT,
  poolSize,
  RANDOM_COUNT_LIMIT,
  type RandomOptions,
} from '../../logic/random.ts';

initPageShell('random');

const els = {
  length: byId<HTMLInputElement>('rand-length'),
  count: byId<HTMLInputElement>('rand-count'),
  uppercase: byId<HTMLInputElement>('rand-uppercase'),
  lowercase: byId<HTMLInputElement>('rand-lowercase'),
  digits: byId<HTMLInputElement>('rand-digits'),
  symbols: byId<HTMLInputElement>('rand-symbols'),
  excludeAmbiguous: byId<HTMLInputElement>('rand-exclude-ambiguous'),
  generate: byId<HTMLButtonElement>('rand-generate'),
  error: byId<HTMLElement>('rand-error'),
  status: byId<HTMLElement>('rand-status'),
  output: byId<HTMLTextAreaElement>('rand-output'),
  copy: byId<HTMLButtonElement>('rand-copy'),
  entropyValue: byId<HTMLElement>('rand-entropy-value'),
  entropyPool: byId<HTMLElement>('rand-entropy-pool'),
};

function clampNumber(input: HTMLInputElement, min: number, max: number, fallback: number): number {
  const raw = Number.parseInt(input.value, 10);
  if (Number.isNaN(raw)) {
    input.value = String(fallback);
    return fallback;
  }
  const clamped = Math.min(Math.max(raw, min), max);
  if (String(clamped) !== input.value) input.value = String(clamped);
  return clamped;
}

function currentOptions(): RandomOptions {
  return {
    length: clampNumber(els.length, 1, PASSWORD_LIMIT, 20),
    uppercase: els.uppercase.checked,
    lowercase: els.lowercase.checked,
    digits: els.digits.checked,
    symbols: els.symbols.checked,
    excludeAmbiguous: els.excludeAmbiguous.checked,
  };
}

function onGenerate(): void {
  const options = currentOptions();
  const count = clampNumber(els.count, 1, RANDOM_COUNT_LIMIT, 5);
  let list: string[];
  try {
    list = generateSecureStrings(count, options);
  } catch (error) {
    showError('rand-error', error instanceof Error ? error.message : String(error));
    setStatus('rand-status', 'Generation failed');
    return;
  }
  clearError('rand-error');
  els.output.value = list.join('\n');
  const bits = entropyBits(options);
  els.entropyValue.textContent = bits.toFixed(1);
  els.entropyPool.textContent = `${poolSize(options)} characters`;
  setStatus(
    'rand-status',
    `Generated ${count} value${count === 1 ? '' : 's'} of ${options.length} characters`,
  );
}

els.generate.addEventListener('click', onGenerate);
attachCopy(els.copy, () => els.output.value);

onGenerate();
