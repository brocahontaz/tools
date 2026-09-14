import '../../style.css';
import { attachCopy, byId, clearError, debounce, showError, setStatus } from '../../shared/dom.ts';
import { initPageShell } from '../../shared/shell.ts';
import { convert, YAML_LIMIT, type ConvertDirection } from '../../logic/yaml.ts';
import { guardInput } from '../../shared/limits.ts';

initPageShell();

const DEBOUNCE_MS = 250;

const els = {
  input: byId<HTMLTextAreaElement>('yaml-input'),
  toJsonToYaml: byId<HTMLInputElement>('yaml-dir-json-to-yaml'),
  toYamlToJson: byId<HTMLInputElement>('yaml-dir-yaml-to-json'),
  error: byId<HTMLElement>('yaml-error'),
  status: byId<HTMLElement>('yaml-status'),
  output: byId<HTMLPreElement>('yaml-output'),
  copy: byId<HTMLButtonElement>('yaml-copy'),
};

function currentDirection(): ConvertDirection {
  return els.toYamlToJson.checked ? 'yaml-to-json' : 'json-to-yaml';
}

function update(): void {
  const text = els.input.value;
  if (text.trim() === '') {
    clearError('yaml-error');
    els.output.textContent = '';
    setStatus('yaml-status', '');
    return;
  }

  const overLimit = guardInput(text, YAML_LIMIT);
  if (overLimit) {
    showError('yaml-error', overLimit);
    setStatus('yaml-status', 'Input rejected');
    return;
  }

  const result = convert(text, currentDirection());
  if (!result.ok) {
    showError('yaml-error', result.error);
    setStatus('yaml-status', 'Conversion failed');
    return;
  }

  clearError('yaml-error');
  els.output.textContent = 'json' in result ? result.json : result.yaml;
  setStatus(
    'yaml-status',
    currentDirection() === 'json-to-yaml' ? 'Converted JSON → YAML' : 'Converted YAML → JSON',
  );
}

els.input.addEventListener('input', debounce(update, DEBOUNCE_MS));
for (const radio of [els.toJsonToYaml, els.toYamlToJson]) {
  radio.addEventListener('change', update);
}
attachCopy(els.copy, () => els.output.textContent ?? '');

update();
