const COPY_FEEDBACK_MS = 1500;

/** Returns the element with the given id, throwing when it is missing. */
export function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

/** Sets an element's text content (safe text assignment only). */
export function setTextContent(el: HTMLElement, text: string): void {
  el.textContent = text;
}

let copyStatus: HTMLSpanElement | null = null;

/** Lazily creates one visually-hidden live region announcing copy results. */
function getCopyStatus(): HTMLSpanElement {
  if (!copyStatus || !copyStatus.isConnected) {
    copyStatus = document.createElement('span');
    copyStatus.className = 'visually-hidden';
    copyStatus.setAttribute('aria-live', 'polite');
    document.body.appendChild(copyStatus);
  }
  return copyStatus;
}

/** Wires a copy button: on click copies the provided text and shows brief feedback. */
export function attachCopy(button: HTMLButtonElement, getText: () => string): void {
  if (!button.dataset.label) {
    button.dataset.label = button.textContent ?? 'Copy';
  }
  let revertTimer: number | undefined;
  button.addEventListener('click', () => {
    const text = getText();
    const clipboard = navigator.clipboard;
    if (!clipboard?.writeText) {
      getCopyStatus().textContent = 'Copy failed: clipboard is unavailable';
      return;
    }
    clipboard
      .writeText(text)
      .then(() => {
        button.textContent = 'Copied!';
        getCopyStatus().textContent = 'Copied to clipboard';
        window.clearTimeout(revertTimer);
        revertTimer = window.setTimeout(() => {
          button.textContent = button.dataset.label ?? 'Copy';
        }, COPY_FEEDBACK_MS);
      })
      .catch(() => {
        getCopyStatus().textContent = 'Copy failed';
      });
  });
}

/** Creates a copy button wired with attachCopy. */
export function createCopyButton(
  getText: () => string,
  options?: { label?: string },
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  const label = options?.label ?? 'Copy';
  button.textContent = label;
  button.dataset.label = label;
  attachCopy(button, getText);
  return button;
}

/** Shows an error message in the named error element (must be an alert region). */
export function showError(id: string, message: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (!el.hasAttribute('role')) el.setAttribute('role', 'alert');
  el.textContent = message;
  el.hidden = false;
}

/** Hides and empties the named error element. */
export function clearError(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.hidden = true;
}

/** Updates the named status element (polite live region) with a message. */
export function setStatus(id: string, message: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
  el.textContent = message;
}

/** Returns a debounced wrapper of fn that fires wait ms after the last call. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): (...args: A) => void {
  let timer: number | undefined;
  return (...args: A) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}
