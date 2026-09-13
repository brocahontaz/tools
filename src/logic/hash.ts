import { LIMITS, guardInput } from '../shared/limits.ts';

export type HashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';
export type HashEncoding = 'hex' | 'base64' | 'base64url';

export const MAX_HASH_INPUT = LIMITS.maxChars;

/** Lower-case hexadecimal encoding of bytes. */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** URL-safe Base64 of bytes, without padding. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/** Hashes the UTF-8 bytes of `text` with a Web Crypto digest algorithm. */
export async function hashText(
  text: string,
  algorithm: HashAlgorithm,
  encoding: HashEncoding,
): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(algorithm, data);
  const bytes = new Uint8Array(digest);
  switch (encoding) {
    case 'hex':
      return bytesToHex(bytes);
    case 'base64':
      return bytesToBase64(bytes);
    case 'base64url':
      return bytesToBase64Url(bytes);
  }
}

/** Validates raw hash input; input is hashed as its UTF-8 text bytes. */
export function parseHashInput(
  text: string,
): { ok: true; bytes: Uint8Array } | { ok: false; error: string } {
  const overLimit = guardInput(text, MAX_HASH_INPUT);
  if (overLimit) return { ok: false, error: overLimit };
  return { ok: true, bytes: new TextEncoder().encode(text) };
}
