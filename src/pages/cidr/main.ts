import '../../style.css';
import { byId, clearError, debounce, showError, setStatus } from '../../shared/dom.ts';
import { formatNumberGrouped } from '../../shared/format.ts';
import { initPageShell } from '../../shared/shell.ts';
import { kvRow } from '../../shared/kv.ts';
import { analyzeIpv4, CIDR_INPUT_PLACEHOLDER, type Ipv4Analysis } from '../../logic/cidr.ts';

initPageShell('cidr');

const DEBOUNCE_MS = 250;

const els = {
  input: byId<HTMLInputElement>('cidr-input'),
  error: byId<HTMLElement>('cidr-error'),
  status: byId<HTMLElement>('cidr-status'),
  results: byId<HTMLDivElement>('cidr-results'),
};

els.input.placeholder = CIDR_INPUT_PLACEHOLDER;

function inRangeText(value: boolean | null): string {
  if (value === null) return '—';
  return value ? 'Yes' : 'No';
}

function optionalText(value: string | null): string {
  return value ?? '—';
}

function update(): void {
  const text = els.input.value;
  if (text.trim() === '') {
    clearError('cidr-error');
    els.results.hidden = true;
    els.results.replaceChildren();
    setStatus('cidr-status', '');
    return;
  }

  const result = analyzeIpv4(text);
  if (!result.ok) {
    showError('cidr-error', result.error);
    els.results.hidden = true;
    els.results.replaceChildren();
    setStatus('cidr-status', 'Invalid input');
    return;
  }

  clearError('cidr-error');
  const a: Ipv4Analysis = result.analysis;
  const rows: Array<[string, string]> = [
    ['Network', a.network],
    ['Prefix', `/${a.prefix}`],
    ['Netmask', a.netmask],
    ['Wildcard', a.wildcard],
    ['Broadcast', a.broadcast],
    ['First host', optionalText(a.firstHost)],
    ['Last host', optionalText(a.lastHost)],
    ['Total addresses', formatNumberGrouped(a.totalAddresses)],
    ['Usable hosts', a.usableHosts === null ? '—' : formatNumberGrouped(a.usableHosts)],
    ['Address in range', inRangeText(a.addressInRange)],
  ];
  els.results.replaceChildren();
  for (const [term, description] of rows) els.results.append(kvRow(term, description));
  els.results.hidden = false;
  setStatus('cidr-status', `Analyzed /${a.prefix}`);
}

els.input.addEventListener('input', debounce(update, DEBOUNCE_MS));

update();
