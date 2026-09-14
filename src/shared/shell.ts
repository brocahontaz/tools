import { TOOLS } from '../tools/registry.ts';

const LOCAL_NOTE_TEXT = 'Processing happens locally in your browser';
const FOOTER_NOTE_TEXT =
  'All tools run locally in your browser. No accounts, no analytics, no server-side storage — your input never leaves this page.';

/** Returns a tool URL without coupling it to the origin serving the page. */
export function portableToolHref(path: string, origin = globalThis.location.origin): string {
  const url = new URL(path, origin);
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Fills the shared page shell: local-processing note and footer note.
 * Missing placeholders are skipped so pages may omit them.
 */
export function initPageShell(): void {
  const localNote = document.getElementById('local-note');
  if (localNote) localNote.textContent = LOCAL_NOTE_TEXT;
  const footerNote = document.getElementById('footer-note');
  if (footerNote) footerNote.textContent = FOOTER_NOTE_TEXT;
}

/** Renders the home grid of tool cards from the registry. */
export function renderToolsGrid(container: HTMLElement): void {
  const cards: HTMLAnchorElement[] = [];
  for (const tool of TOOLS) {
    const card = document.createElement('a');
    card.className = 'tool-card';
    card.setAttribute('href', portableToolHref(tool.path));
    const title = document.createElement('h3');
    title.textContent = tool.name;
    const description = document.createElement('p');
    description.textContent = tool.description;
    card.append(title, description);
    cards.push(card);
  }
  container.replaceChildren(...cards);
}
