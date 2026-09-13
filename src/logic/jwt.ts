import { decodeBase64Url } from './base64.ts';
import { describeLocalTime } from '../shared/format.ts';

export interface JwtSegment {
  name: 'header' | 'payload' | 'signature';
  raw: string;
  json: string | null;
}

export interface JwtDecoded {
  segments: JwtSegment[];
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string;
  headerJson: string;
  payloadJson: string;
}

export const JWT_ALGORITHM_NOTE = 'Decoding does not verify the signature or the token validity';

export type DecodeJwtResult = { ok: true; decoded: JwtDecoded } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Decodes a compact JWS (three dot-separated base64url segments) without verifying it. */
export function decodeJwt(token: string): DecodeJwtResult {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { ok: false, error: `Expected 3 dot-separated segments, got ${parts.length}` };
  }
  const [rawHeader, rawPayload, rawSignature] = parts;

  let headerJson: string;
  let payloadJson: string;
  try {
    headerJson = decodeBase64Url(rawHeader);
  } catch (error) {
    return {
      ok: false,
      error: `Failed to decode header: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  try {
    payloadJson = decodeBase64Url(rawPayload);
  } catch (error) {
    return {
      ok: false,
      error: `Failed to decode payload: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  let header: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(headerJson);
    header = isRecord(parsed) ? parsed : null;
  } catch {
    return { ok: false, error: 'Header is not valid JSON' };
  }

  let payload: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(payloadJson);
    payload = isRecord(parsed) ? parsed : null;
  } catch {
    return { ok: false, error: 'Payload is not valid JSON' };
  }

  return {
    ok: true,
    decoded: {
      segments: [
        { name: 'header', raw: rawHeader, json: headerJson },
        { name: 'payload', raw: rawPayload, json: payloadJson },
        { name: 'signature', raw: rawSignature, json: null },
      ],
      header,
      payload,
      signature: rawSignature,
      headerJson,
      payloadJson,
    },
  };
}

export interface JwtTimestampRow {
  key: 'iat' | 'exp' | 'nbf';
  value: number;
  local: string;
  /** Seconds until expiry for `exp` (negative once expired). Absent for other claims. */
  relativeSeconds?: number;
}

const TIMESTAMP_KEYS = ['iat', 'exp', 'nbf'] as const satisfies readonly JwtTimestampRow['key'][];

export interface JwtNamedClaim {
  key: string;
  value: string;
}

const HEADER_CLAIM_KEYS = ['alg', 'typ'] as const;
const PAYLOAD_CLAIM_KEYS = ['sub', 'iss', 'aud'] as const;

/** Formats a claim value as textContent-safe text: strings as-is, other values as JSON. */
function claimText(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value) ?? String(value);
}

/**
 * Single-sources the named claim rows: header `alg` / `typ`, payload `sub` / `iss` / `aud`.
 * Missing claims are skipped; values are plain strings (arrays such as `aud` render as JSON).
 */
export function namedJwtClaims(
  header: Record<string, unknown> | null,
  payload: Record<string, unknown> | null,
): JwtNamedClaim[] {
  const rows: JwtNamedClaim[] = [];
  if (header) {
    for (const key of HEADER_CLAIM_KEYS) {
      if (key in header) rows.push({ key, value: claimText(header[key]) });
    }
  }
  if (payload) {
    for (const key of PAYLOAD_CLAIM_KEYS) {
      if (key in payload) rows.push({ key, value: claimText(payload[key]) });
    }
  }
  return rows;
}

/** Extracts iat / exp / nbf claims with local-time and relative representations. */
export function formatJwtTimestamps(dec: JwtDecoded): JwtTimestampRow[] {
  const rows: JwtTimestampRow[] = [];
  const payload = dec.payload ?? {};
  for (const key of TIMESTAMP_KEYS) {
    const value = payload[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const row: JwtTimestampRow = {
      key,
      value,
      local: describeLocalTime(value * 1000),
    };
    if (key === 'exp') {
      row.relativeSeconds = Math.round(value - Date.now() / 1000);
    }
    rows.push(row);
  }
  return rows;
}
