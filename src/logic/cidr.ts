export interface Ipv4Analysis {
  prefix: number;
  network: string;
  broadcast: string;
  netmask: string;
  wildcard: string;
  firstHost: string | null;
  lastHost: string | null;
  totalAddresses: number;
  usableHosts: number | null;
  addressInRange: boolean | null;
}

export const CIDR_INPUT_PLACEHOLDER = '192.168.1.130/26';

export type Ipv4ParseResult = { ok: true; value: number } | { ok: false; error: string };

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** Formats a 32-bit unsigned integer as dotted-quad IPv4. */
export function formatIpv4(value: number): string {
  return `${(value >>> 24) & 255}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`;
}

/** Parses strict dotted-quad IPv4 (four 0–255 octets, no spaces). */
export function parseIpv4(text: string): Ipv4ParseResult {
  const match = IPV4_PATTERN.exec(text.trim());
  if (!match) {
    return { ok: false, error: 'Invalid IPv4 address (expected a.b.c.d)' };
  }
  let value = 0;
  for (const octet of match.slice(1)) {
    const n = Number.parseInt(octet, 10);
    if (n > 255) {
      return { ok: false, error: 'Invalid IPv4 address (expected a.b.c.d)' };
    }
    value = (value << 8) | n;
  }
  return { ok: true, value: value >>> 0 };
}

/** Prefix mask for 0–32 as a uint32 (0 for /0, all ones for /32). */
function prefixMask(prefix: number): number {
  if (prefix === 0) return 0;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

/** Returns the prefix length for a contiguous netmask value, or null. */
function netmaskToPrefix(mask: number): number | null {
  for (let prefix = 0; prefix <= 32; prefix += 1) {
    if (prefixMask(prefix) === mask) return prefix;
  }
  return null;
}

export type NetmaskParseResult = { ok: true; prefix: number } | { ok: false; error: string };

/** Parses a dotted-quad netmask; only contiguous 1-bits are accepted. */
export function parseNetmask(text: string): NetmaskParseResult {
  const parsed = parseIpv4(text);
  if (!parsed.ok) {
    return { ok: false, error: 'Invalid netmask (expected a.b.c.d)' };
  }
  const prefix = netmaskToPrefix(parsed.value);
  if (prefix === null) {
    return { ok: false, error: 'Netmask must be contiguous' };
  }
  return { ok: true, prefix };
}

export type CidrResult = { ok: true; analysis: Ipv4Analysis } | { ok: false; error: string };

/**
 * Analyzes an IPv4 subnet. Accepted forms:
 * - `a.b.c.d/p` (prefix 0–32) or `a.b.c.d/m.m.m.m` (dotted netmask)
 * - `a.b.c.d netmask` (space-separated netmask)
 * - bare `a.b.c.d` (treated as /32)
 * - `netmask /prefix` (netmask-only; no host address is known)
 *
 * `addressInRange` says whether the given address is a usable host in range;
 * null when the input had no address — including `0.0.0.0`, which is the
 * unspecified placeholder rather than a host. /31 and /32 have no separate
 * network/broadcast reservation, so firstHost/lastHost/usableHosts are null.
 */
export function analyzeIpv4(input: string): CidrResult {
  const trimmed = input.trim();
  if (trimmed === '') {
    return { ok: false, error: 'Enter an IPv4 address or CIDR range' };
  }

  let address: number | null = null;
  let prefix: number | null = null;
  let addressIsZero = false;

  const spaceSplit = trimmed.split(/\s+/);
  if (spaceSplit.length === 2) {
    const [first, second] = spaceSplit;
    if (second.startsWith('/')) {
      // Netmask-only form: `255.255.255.0 /24`.
      const mask = parseNetmask(first);
      if (!mask.ok) return { ok: false, error: mask.error };
      const prefixPart = parsePrefix(second.slice(1));
      if (!prefixPart.ok) return { ok: false, error: prefixPart.error };
      prefix = prefixPart.prefix;
    } else {
      // `a.b.c.d netmask` form.
      const parsedAddress = parseIpv4(first);
      if (!parsedAddress.ok) return { ok: false, error: parsedAddress.error };
      const mask = parseNetmask(second);
      if (!mask.ok) return { ok: false, error: mask.error };
      address = parsedAddress.value;
      prefix = mask.prefix;
    }
  } else if (spaceSplit.length === 1) {
    const slashSplit = trimmed.split('/');
    if (slashSplit.length > 2) {
      return { ok: false, error: 'Invalid IPv4 address (expected a.b.c.d)' };
    }
    const parsedAddress = parseIpv4(slashSplit[0]);
    if (!parsedAddress.ok) return { ok: false, error: parsedAddress.error };
    address = parsedAddress.value;
    if (slashSplit.length === 2) {
      const part = slashSplit[1].trim();
      if (/^\d+$/.test(part)) {
        const prefixPart = parsePrefix(part);
        if (!prefixPart.ok) return { ok: false, error: prefixPart.error };
        prefix = prefixPart.prefix;
      } else {
        const mask = parseNetmask(part);
        if (!mask.ok) return { ok: false, error: mask.error };
        prefix = mask.prefix;
      }
    } else {
      prefix = 32; // bare address
    }
  } else {
    return { ok: false, error: 'Invalid IPv4 address (expected a.b.c.d)' };
  }

  if (prefix === null) {
    return { ok: false, error: 'Enter an IPv4 address or CIDR range' };
  }
  if (address !== null && address === 0) {
    addressIsZero = true;
  }

  const mask = prefixMask(prefix);
  const network = address === null ? 0 : (address & mask) >>> 0;
  const broadcast = (network | (mask ^ 0xffffffff)) >>> 0;

  const totalAddresses = Math.pow(2, 32 - prefix);
  const smallNetwork = prefix <= 30;
  const usableHosts = smallNetwork ? totalAddresses - 2 : null;
  const firstHost = smallNetwork ? formatIpv4((network + 1) >>> 0) : null;
  const lastHost = smallNetwork ? formatIpv4((broadcast - 1) >>> 0) : null;

  let addressInRange: boolean | null = null;
  if (address !== null && !addressIsZero) {
    addressInRange = smallNetwork ? address !== network && address !== broadcast : true; // /31 and /32 reserve nothing: every address in range is usable
  }

  return {
    ok: true,
    analysis: {
      prefix,
      network: formatIpv4(network),
      broadcast: formatIpv4(broadcast),
      netmask: formatIpv4(mask),
      wildcard: formatIpv4(mask ^ 0xffffffff),
      firstHost,
      lastHost,
      totalAddresses,
      usableHosts,
      addressInRange,
    },
  };
}

function parsePrefix(text: string): { ok: true; prefix: number } | { ok: false; error: string } {
  if (!/^\d+$/.test(text)) {
    return { ok: false, error: 'Invalid IPv4 address (expected a.b.c.d)' };
  }
  const prefix = Number.parseInt(text, 10);
  if (prefix > 32) {
    return { ok: false, error: 'Prefix length must be between 0 and 32' };
  }
  return { ok: true, prefix };
}
