import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TOOLS } from '../tools/registry.ts';
import { initPageShell, portableToolHref, renderToolsGrid } from './shell.ts';

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly classList = { add: (..._names: string[]) => undefined };
  className = '';
  textContent = '';

  constructor(readonly tagName: string) {}

  append(...elements: FakeElement[]): void {
    this.children.push(...elements);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  replaceChildren(...elements: FakeElement[]): void {
    this.children.splice(0, this.children.length, ...elements);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
}

class FakeDocument {
  readonly elements = new Map<string, FakeElement>();

  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName);
  }

  getElementById(id: string): FakeElement | null {
    return this.elements.get(id) ?? null;
  }
}

function expectPortableToolLinks(elements: FakeElement[]): void {
  expect(elements.map((element) => element.getAttribute('href'))).toEqual(
    TOOLS.map((tool) => tool.path),
  );
  for (const element of elements) {
    expect(element.getAttribute('href')).not.toContain(':8080');
  }
}

let document: FakeDocument;

beforeEach(() => {
  document = new FakeDocument();
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: { origin: 'http://localhost:8080' },
  });
});

afterEach(() => {
  delete (globalThis as { document?: Document }).document;
  delete (globalThis as { location?: Location }).location;
});

describe('portableToolHref', () => {
  it('keeps generated tool links origin-independent', () => {
    const href = portableToolHref('/jwt', 'http://localhost:8080');

    expect(href).toBe('/jwt');
    expect(href).not.toContain(':8080');
    expect(new URL(href, 'https://tools.example').href).toBe('https://tools.example/jwt');
  });

  it('produces portable links for every registered tool', () => {
    for (const tool of TOOLS) {
      const href = portableToolHref(tool.path, 'https://tools.example');

      expect(href).not.toContain(':8080');
      expect(new URL(href, 'https://tools.example').pathname).toBe(tool.path);
    }
  });
});

describe('rendered tool links', () => {
  it('keeps the local-processing and footer shell text', () => {
    const localNote = new FakeElement('span');
    const footerNote = new FakeElement('p');
    document.elements.set('local-note', localNote);
    document.elements.set('footer-note', footerNote);

    initPageShell();

    expect(localNote.textContent).toBe('Processing happens locally in your browser');
    expect(footerNote.textContent).toContain('All tools run locally in your browser.');
  });

  it('does not render the removed top navigation', () => {
    initPageShell();

    expect(document.getElementById('tools-nav')).toBeNull();
  });

  it('writes portable href attributes for every home grid card', () => {
    const grid = new FakeElement('main');

    renderToolsGrid(grid as unknown as HTMLElement);

    expectPortableToolLinks(grid.children);
  });
});
