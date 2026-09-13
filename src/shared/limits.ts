export const LIMITS = {
  maxChars: 100_000,
  maxJsonChars: 200_000,
  maxDiffLines: 2_000,
  maxDiffChars: 50_000,
  maxUuidCount: 100,
  maxRandomCount: 50,
  maxPasswordLength: 512,
} as const;

/** Returns null when the input is within the limit, or an error message when it is too large. */
export function guardInput(text: string, max: number): string | null {
  if (text.length <= max) return null;
  return `Input is too large (${text.length.toLocaleString('en-US')} of ${max.toLocaleString(
    'en-US',
  )} characters)`;
}
