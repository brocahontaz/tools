import '../../style.css';
import { byId, clearError, debounce, showError, setStatus } from '../../shared/dom.ts';
import { initPageShell } from '../../shared/shell.ts';
import { kvRow } from '../../shared/kv.ts';
import {
  describeUnixTimestamp,
  parseDateInput,
  parseUnixTimestamp,
} from '../../logic/timestamp.ts';

initPageShell();

const DEBOUNCE_MS = 250;

const els = {
  now: byId<HTMLButtonElement>('ts-now'),
  status: byId<HTMLElement>('ts-status'),
  unixInput: byId<HTMLInputElement>('ts-unix'),
  unixNote: byId<HTMLElement>('ts-unit-note'),
  unixResults: byId<HTMLDivElement>('ts-unix-results'),
  unixError: byId<HTMLElement>('ts-unix-error'),
  dateInput: byId<HTMLInputElement>('ts-date'),
  dateResults: byId<HTMLDivElement>('ts-date-results'),
  dateError: byId<HTMLElement>('ts-date-error'),
};

function setRows(container: HTMLDivElement, rows: Array<[string, string]>): void {
  container.replaceChildren();
  for (const [term, description] of rows) container.append(kvRow(term, description));
  container.hidden = rows.length === 0;
}

function updateUnix(): void {
  const text = els.unixInput.value;
  if (text.trim() === '') {
    clearError('ts-unix-error');
    els.unixNote.textContent = '';
    setRows(els.unixResults, []);
    return;
  }

  const result = parseUnixTimestamp(text);
  if (!result.ok) {
    showError('ts-unix-error', result.error);
    els.unixNote.textContent = '';
    setRows(els.unixResults, []);
    return;
  }

  clearError('ts-unix-error');
  const { ms, unit } = result.parsed;
  els.unixNote.textContent = `Detected ${unit === 's' ? 'seconds' : 'milliseconds'}`;
  const described = describeUnixTimestamp(ms, Date.now());
  setRows(els.unixResults, [
    ['ISO (UTC)', described.isoUtc],
    ['Local', described.local],
    ['Relative', described.relative],
    ['Seconds', described.seconds],
    ['Milliseconds', described.milliseconds],
  ]);
}

function updateDate(): void {
  const text = els.dateInput.value;
  if (text.trim() === '') {
    clearError('ts-date-error');
    setRows(els.dateResults, []);
    return;
  }

  const result = parseDateInput(text);
  if (!result.ok) {
    showError('ts-date-error', result.error);
    setRows(els.dateResults, []);
    return;
  }

  clearError('ts-date-error');
  const ms = result.ms;
  const seconds = Math.floor(ms / 1000);
  setRows(els.dateResults, [
    ['Seconds', seconds.toLocaleString('en-US')],
    ['Milliseconds', ms.toLocaleString('en-US')],
    ['ISO (UTC)', new Date(ms).toISOString()],
  ]);
}

function updateAll(): void {
  updateUnix();
  updateDate();
}

els.unixInput.addEventListener('input', debounce(updateUnix, DEBOUNCE_MS));
els.dateInput.addEventListener('input', debounce(updateDate, DEBOUNCE_MS));
els.now.addEventListener('click', () => {
  const nowMs = Date.now();
  els.unixInput.value = String(Math.floor(nowMs / 1000));
  els.dateInput.value = new Date(nowMs).toISOString();
  updateAll();
  setStatus('ts-status', 'Filled with the current moment');
});

updateAll();
