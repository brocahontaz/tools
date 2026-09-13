import '../../style.css';
import { attachCopy, byId, clearError, showError, setStatus } from '../../shared/dom.ts';
import { formatBytes, formatNumberGrouped } from '../../shared/format.ts';
import { initPageShell } from '../../shared/shell.ts';
import { generateUuidV4, UUID_LIMIT, uppercase, uuidStats } from '../../logic/uuid.ts';

initPageShell('uuid');

const els = {
  count: byId<HTMLInputElement>('uuid-count'),
  uppercase: byId<HTMLInputElement>('uuid-uppercase'),
  generate: byId<HTMLButtonElement>('uuid-generate'),
  error: byId<HTMLElement>('uuid-error'),
  status: byId<HTMLElement>('uuid-status'),
  output: byId<HTMLTextAreaElement>('uuid-output'),
  copy: byId<HTMLButtonElement>('uuid-copy'),
  stats: byId<HTMLElement>('uuid-stats'),
};

let lastList: string[] = [];

function clampCount(): number {
  const raw = Number.parseInt(els.count.value, 10);
  if (Number.isNaN(raw)) {
    els.count.value = '5';
    return 5;
  }
  const clamped = Math.min(Math.max(raw, 1), UUID_LIMIT);
  if (String(clamped) !== els.count.value) els.count.value = String(clamped);
  return clamped;
}

function render(list: string[]): void {
  els.output.value = list.join('\n');
  const stats = uuidStats(list);
  els.stats.textContent =
    `${formatNumberGrouped(stats.count)} UUID${stats.count === 1 ? '' : 's'}` +
    ` · ${formatBytes(stats.bytesPer)} each · ${formatBytes(stats.totalText)} total`;
  setStatus(
    'uuid-status',
    `Generated ${formatNumberGrouped(stats.count)} UUID v4 value${stats.count === 1 ? '' : 's'}`,
  );
}

function onGenerate(): void {
  const count = clampCount();
  try {
    lastList = generateUuidV4(count);
  } catch (error) {
    showError('uuid-error', error instanceof Error ? error.message : String(error));
    setStatus('uuid-status', 'Generation failed');
    return;
  }
  clearError('uuid-error');
  render(els.uppercase.checked ? uppercase(lastList) : lastList);
}

function onCountChange(): void {
  clampCount();
}

els.generate.addEventListener('click', onGenerate);
els.count.addEventListener('change', onCountChange);
els.uppercase.addEventListener('change', () => {
  if (lastList.length === 0) return;
  clearError('uuid-error');
  render(els.uppercase.checked ? uppercase(lastList) : lastList);
});
attachCopy(els.copy, () => els.output.value);
