import { LIMITS } from '../shared/limits.ts';

export const UUID_LIMIT = LIMITS.maxUuidCount;

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Generates `count` random UUID version 4 values via crypto.randomUUID. */
export function generateUuidV4(count: number): string[] {
  if (!Number.isInteger(count) || count < 1 || count > UUID_LIMIT) {
    throw new RangeError(`Count must be an integer between 1 and ${UUID_LIMIT}`);
  }
  const list: string[] = [];
  for (let i = 0; i < count; i += 1) list.push(crypto.randomUUID());
  return list;
}

/** Returns the UUIDs upper-cased. */
export function uppercase(list: string[]): string[] {
  return list.map((id) => id.toUpperCase());
}

export interface UuidStats {
  count: number;
  bytesPer: number;
  totalText: number;
  avgLen: number;
}

/** Text statistics for a list of UUIDs (UTF-8 byte sizes via TextEncoder). */
export function uuidStats(list: string[]): UuidStats {
  const encoder = new TextEncoder();
  if (list.length === 0) {
    return { count: 0, bytesPer: 0, totalText: 0, avgLen: 0 };
  }
  const bytesPer = encoder.encode(list[0]).length;
  let totalText = 0;
  let totalChars = 0;
  for (const id of list) {
    totalText += encoder.encode(id).length;
    totalChars += id.length;
  }
  return {
    count: list.length,
    bytesPer,
    totalText,
    avgLen: totalChars / list.length,
  };
}

export { UUID_V4_PATTERN };
