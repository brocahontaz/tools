import { LIMITS, guardInput } from '../shared/limits.ts';
import { bytesToBase64Url, bytesToHex } from './hash.ts';

export type HmacAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';
export type HmacEncoding = 'hex' | 'base64' | 'base64url';

/**
 * Returns null when the message and secret are usable, or an error message:
 * size limits first, then the required secret. Pages call this before signing.
 */
export function validateHmacInput(message: string, secret: string): string | null {
  const messageIssue = guardInput(message, LIMITS.maxChars);
  if (messageIssue) return messageIssue;
  if (secret === '') return 'Enter a secret to sign the message';
  const secretIssue = guardInput(secret, LIMITS.maxChars);
  if (secretIssue) return secretIssue;
  return null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Signs the UTF-8 bytes of `message` with the UTF-8 bytes of `secret`. */
export async function hmacText(
  message: string,
  secret: string,
  algorithm: HmacAlgorithm,
  encoding: HmacEncoding,
): Promise<string> {
  if (secret === '') throw new Error('Secret must not be empty');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const bytes = new Uint8Array(signature);
  switch (encoding) {
    case 'hex':
      return bytesToHex(bytes);
    case 'base64':
      return bytesToBase64(bytes);
    case 'base64url':
      return bytesToBase64Url(bytes);
  }
}
