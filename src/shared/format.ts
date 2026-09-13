const BYTE_UNITS = ['KiB', 'MiB', 'GiB', 'TiB'] as const;

/** Formats a byte count using 1024-based units, with one decimal only when needed. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  let value = n;
  let unit: string = BYTE_UNITS[BYTE_UNITS.length - 1];
  for (const u of BYTE_UNITS) {
    value /= 1024;
    unit = u;
    if (value < 1024) break;
  }
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${text} ${unit}`;
}

/** Formats a number with en-US thousands separators. */
export function formatNumberGrouped(n: number): string {
  return n.toLocaleString('en-US');
}

/** Formats a Unix timestamp in seconds as a grouped number with a unit suffix. */
export function formatUnixSecondsGrouped(seconds: number): string {
  return `${formatNumberGrouped(seconds)} s`;
}

/** Formats a millisecond timestamp using the local time representation. */
export function describeLocalTime(ms: number): string {
  return new Date(ms).toString();
}
