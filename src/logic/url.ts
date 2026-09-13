export type UrlMode = 'component' | 'full';

/** Percent-encodes text as a URI component or as a full URL. */
export function encodeUrl(text: string, mode: UrlMode): string {
  return mode === 'component' ? encodeURIComponent(text) : encodeURI(text);
}

/** Percent-decodes text, reporting malformed percent-encoding as a failure. */
export function decodeUrl(
  text: string,
  mode: UrlMode,
): { ok: true; text: string } | { ok: false; error: string } {
  try {
    const decoded = mode === 'component' ? decodeURIComponent(text) : decodeURI(text);
    return { ok: true, text: decoded };
  } catch {
    return { ok: false, error: 'Malformed percent-encoding' };
  }
}

export interface UrlParts {
  protocol: string | null;
  host: string | null;
  port: string | null;
  pathname: string | null;
  search: string | null;
  hash: string | null;
  origin: string | null;
  credentials: string | null;
}

const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;

/** Inspects the components of an absolute URL; fails for anything else. */
export function urlParts(text: string): UrlParts | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!ABSOLUTE_URL.test(trimmed)) {
    return { ok: false, error: 'Enter an absolute URL to inspect its parts' };
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Enter an absolute URL to inspect its parts' };
  }
  const hasCredentials = url.username !== '' || url.password !== '';
  return {
    protocol: url.protocol,
    host: url.host === '' ? null : url.host,
    port: url.port === '' ? null : url.port,
    pathname: url.pathname,
    search: url.search === '' ? null : url.search,
    hash: url.hash === '' ? null : url.hash,
    origin: url.origin,
    credentials: hasCredentials ? `${url.username}:${url.password}` : null,
  };
}
