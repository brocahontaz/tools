import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const config = readFileSync(path.join(repoRoot, 'nginx.conf'), 'utf-8');

/** Extracts the single server block from the config. */
function serverBlock(): string {
  const match = config.match(/server\s*{([\s\S]*)}/);
  expect(match, 'nginx.conf must contain a server block').not.toBeNull();
  return match![1];
}

describe('nginx config port portability', () => {
  it('disables absolute redirects so directory redirects stay origin-relative', () => {
    // try_files $uri/ triggers nginx's implicit /tool -> /tool/ 301. With
    // absolute_redirect on (the default) that redirect leaks the container's
    // own scheme and listen port (e.g. http://<public host>:8080/jwt/), which
    // 404s behind the public proxy.
    expect(serverBlock()).toMatch(/^\s*absolute_redirect\s+off;\s*$/m);
  });

  it('keeps the listen port out of every non-listen directive', () => {
    const directives = serverBlock()
      .split('\n')
      .filter((line) => !/^\s*(#|listen\s)/.test(line));
    const offending = directives.filter((line) => line.includes('8080'));

    expect(offending).toEqual([]);
  });

  it('contains no hard-coded absolute redirect targets', () => {
    expect(config).not.toMatch(/return\s+30[127]\s+https?:\/\//);
  });
});
