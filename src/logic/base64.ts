export type Base64Variant = 'standard' | 'url';

const WHITESPACE = /\s+/g;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Encodes UTF-8 text as Base64 (standard or URL-safe, padding stripped for URL-safe). */
export function encodeBase64(text: string, variant: Base64Variant): string {
  const bytes = new TextEncoder().encode(text);
  const base64 = bytesToBase64(bytes);
  if (variant === 'url') {
    return base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  }
  return base64;
}

const STANDARD_ALPHABET = /^[A-Za-z0-9+/]*={0,2}$/;
const URL_ALPHABET = /^[A-Za-z0-9_-]*={0,2}$/;

/**
 * Decodes Base64 or Base64URL text. Tolerates missing `=` padding, stray padding
 * and embedded whitespace; rejects characters outside the selected alphabet.
 */
export function decodeBase64(
  text: string,
  variant: Base64Variant,
): { ok: true; text: string } | { ok: false; error: string } {
  const stripped = text.replace(WHITESPACE, '');
  if (stripped === '') return { ok: true, text: '' };

  const alphabet = variant === 'url' ? URL_ALPHABET : STANDARD_ALPHABET;
  if (!alphabet.test(stripped)) {
    return {
      ok: false,
      error:
        variant === 'url'
          ? 'Input contains characters that are not valid Base64URL'
          : 'Input contains characters that are not valid Base64',
    };
  }

  let normalized = stripped;
  if (variant === 'url') {
    normalized = normalized.replaceAll('-', '+').replaceAll('_', '/');
  }

  const unpadded = normalized.replace(/=+$/, '');
  if (unpadded.length % 4 === 1) {
    return { ok: false, error: 'Invalid Base64 length — input cannot be padded to a full block' };
  }
  const padded = unpadded + '='.repeat((4 - (unpadded.length % 4)) % 4);

  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    return { ok: false, error: 'Invalid Base64 input' };
  }

  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { ok: true, text: decoded };
  } catch {
    return { ok: false, error: 'Decoded bytes are not valid UTF-8' };
  }
}

/**
 * Decodes Base64URL text, returning the decoded UTF-8 string or throwing an
 * Error with the decode failure message. Used by the JWT decoder.
 */
export function decodeBase64Url(text: string): string {
  const result = decodeBase64(text, 'url');
  if (!result.ok) throw new Error(result.error);
  return result.text;
}
