import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Directories that are never tool pages.
const SKIP_DIRS = new Set(['dist', 'node_modules', 'public']);

// A tool page is any root-level directory containing an index.html.
// Adding a new tool = drop in a folder; no config edit needed.
function discoverToolPages(): string[] {
  return readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('.') && !SKIP_DIRS.has(entry.name))
    .filter((entry) => existsSync(path.join(rootDir, entry.name, 'index.html')))
    .map((entry) => entry.name)
    .sort();
}

const input: Record<string, string> = {
  main: path.resolve(rootDir, 'index.html'),
};

if (existsSync(path.join(rootDir, '404.html'))) {
  input['404'] = path.resolve(rootDir, '404.html');
}

for (const dir of discoverToolPages()) {
  input[dir] = path.resolve(rootDir, dir, 'index.html');
}

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input,
    },
  },
});
