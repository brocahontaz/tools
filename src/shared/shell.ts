import { TOOLS } from '../tools/registry.ts';

const LOCAL_NOTE_TEXT = 'Processing happens locally in your browser';
const FOOTER_NOTE_TEXT =
  'All tools run locally in your browser. No accounts, no analytics, no server-side storage — your input never leaves this page.';

/**
 * Fills the shared page shell: tools nav chips, local-processing note and footer note.
 * Missing placeholders are skipped so pages may omit them.
 */
export function initPageShell(activeToolId?: string): void {
  renderToolsNav(activeToolId);
  const localNote = document.getElementById('local-note');
  if (localNote) localNote.textContent = LOCAL_NOTE_TEXT;
  const footerNote = document.getElementById('footer-note');
  if (footerNote) footerNote.textContent = FOOTER_NOTE_TEXT;
}

/** Renders the tool chips into #tools-nav, marking the active tool. */
function renderToolsNav(activeToolId?: string): void {
  const nav = document.getElementById('tools-nav');
  if (!nav) return;
  if (!nav.hasAttribute('aria-label')) nav.setAttribute('aria-label', 'Tools');
  const links: HTMLAnchorElement[] = [];
  for (const tool of TOOLS) {
    const link = document.createElement('a');
    link.className = 'tools-nav-link';
    link.href = tool.path;
    link.textContent = tool.name;
    if (tool.id === activeToolId) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
    links.push(link);
  }
  nav.replaceChildren(...links);
}

/** Renders the home grid of tool cards from the registry. */
export function renderToolsGrid(container: HTMLElement): void {
  const cards: HTMLAnchorElement[] = [];
  for (const tool of TOOLS) {
    const card = document.createElement('a');
    card.className = 'tool-card';
    card.href = tool.path;
    const title = document.createElement('h3');
    title.textContent = tool.name;
    const description = document.createElement('p');
    description.textContent = tool.description;
    card.append(title, description);
    cards.push(card);
  }
  container.replaceChildren(...cards);
}
