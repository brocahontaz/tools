import '../../style.css';
import { attachCopy, byId, clearError, debounce, showError, setStatus } from '../../shared/dom.ts';
import { describeLocalTime } from '../../shared/format.ts';
import { initPageShell } from '../../shared/shell.ts';
import {
  decodeJwt,
  formatJwtTimestamps,
  JWT_ALGORITHM_NOTE,
  namedJwtClaims,
  type JwtTimestampRow,
} from '../../logic/jwt.ts';

initPageShell();

const DEBOUNCE_MS = 250;

const els = {
  input: byId<HTMLTextAreaElement>('jwt-input'),
  verifyNote: byId<HTMLElement>('jwt-verify-note'),
  error: byId<HTMLElement>('jwt-error'),
  results: byId<HTMLElement>('jwt-results'),
  status: byId<HTMLElement>('jwt-status'),
  claims: byId<HTMLDivElement>('jwt-claims'),
  headerJson: byId<HTMLPreElement>('jwt-header-json'),
  payloadJson: byId<HTMLPreElement>('jwt-payload-json'),
  timestamps: byId<HTMLDivElement>('jwt-timestamps'),
  note: byId<HTMLElement>('jwt-note'),
  headerCopy: byId<HTMLButtonElement>('jwt-header-copy'),
  payloadCopy: byId<HTMLButtonElement>('jwt-payload-copy'),
};

els.verifyNote.textContent = JWT_ALGORITHM_NOTE;

function appendKvRow(container: HTMLElement, key: string, value: string): void {
  const row = document.createElement('div');
  row.className = 'kv-row';
  const keyEl = document.createElement('div');
  keyEl.className = 'kv-key';
  keyEl.textContent = key;
  const valueEl = document.createElement('div');
  valueEl.className = 'kv-value';
  valueEl.textContent = value;
  row.append(keyEl, valueEl);
  container.append(row);
}

function renderClaims(
  header: Record<string, unknown> | null,
  payload: Record<string, unknown> | null,
): number {
  const rows = namedJwtClaims(header, payload);
  els.claims.replaceChildren();
  for (const row of rows) appendKvRow(els.claims, row.key, row.value);
  els.claims.hidden = rows.length === 0;
  return rows.length;
}

function timestampValueText(row: JwtTimestampRow): string {
  let text = `${describeLocalTime(row.value * 1000)} · ${row.value.toLocaleString('en-US')} s`;
  if (row.key === 'exp' && row.relativeSeconds !== undefined) {
    const relative = row.relativeSeconds;
    text +=
      relative >= 0
        ? ` · expires in ${relative.toLocaleString('en-US')} s`
        : ` · expired ${Math.abs(relative).toLocaleString('en-US')} s ago`;
  }
  return text;
}

function renderTimestamps(dec: Parameters<typeof formatJwtTimestamps>[0]): void {
  const rows = formatJwtTimestamps(dec);
  els.timestamps.replaceChildren();
  if (rows.length === 0) {
    appendKvRow(els.timestamps, '—', 'No iat / exp / nbf claims');
    return;
  }
  for (const row of rows) appendKvRow(els.timestamps, row.key, timestampValueText(row));
}

function update(): void {
  const token = els.input.value.trim();
  if (token === '') {
    clearError('jwt-error');
    els.results.hidden = true;
    setStatus('jwt-status', '');
    return;
  }

  const result = decodeJwt(token);
  if (!result.ok) {
    showError('jwt-error', result.error);
    els.results.hidden = true;
    setStatus('jwt-status', 'Invalid token');
    return;
  }

  clearError('jwt-error');
  const decoded = result.decoded;
  const claimCount = renderClaims(decoded.header, decoded.payload);
  els.headerJson.textContent = decoded.headerJson;
  els.payloadJson.textContent = decoded.payloadJson;
  renderTimestamps(decoded);
  els.note.textContent = JWT_ALGORITHM_NOTE;
  els.results.hidden = false;
  setStatus(
    'jwt-status',
    `Decoded ${decoded.segments.length} segments · ${claimCount} key claims shown`,
  );
}

els.input.addEventListener('input', debounce(update, DEBOUNCE_MS));
attachCopy(els.headerCopy, () => els.headerJson.textContent ?? '');
attachCopy(els.payloadCopy, () => els.payloadJson.textContent ?? '');

update();
