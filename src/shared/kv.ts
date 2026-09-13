/** Builds one key/value row for a `.kv-table` container (textContent only). */
export function kvRow(term: string, description: string): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'kv-row';
  const key = document.createElement('div');
  key.className = 'kv-key';
  key.textContent = term;
  const value = document.createElement('div');
  value.className = 'kv-value';
  value.textContent = description;
  row.append(key, value);
  return row;
}
