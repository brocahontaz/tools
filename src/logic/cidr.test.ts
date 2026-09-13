import { describe, expect, it } from 'vitest';
import {
  analyzeIpv4,
  CIDR_INPUT_PLACEHOLDER,
  formatIpv4,
  parseIpv4,
  parseNetmask,
} from './cidr.ts';

describe('formatIpv4', () => {
  it('formats uint32 values as dotted quads', () => {
    expect(formatIpv4(0xc0a80182)).toBe('192.168.1.130');
    expect(formatIpv4(0)).toBe('0.0.0.0');
    expect(formatIpv4(0xffffffff)).toBe('255.255.255.255');
  });
});

describe('parseIpv4', () => {
  it('parses strict dotted quads', () => {
    expect(parseIpv4('192.168.1.130')).toEqual({ ok: true, value: 0xc0a80182 });
    expect(parseIpv4(' 10.0.0.1 ')).toEqual({ ok: true, value: 0x0a000001 });
  });

  it('rejects malformed addresses', () => {
    for (const bad of ['256.1.1.1', '1.2.3', '1.2.3.4.5', 'a.b.c.d', '1.2.3.', '', '1 2.3.4.5']) {
      const failure = parseIpv4(bad);
      expect(failure.ok).toBe(false);
      if (!failure.ok) expect(failure.error).toBe('Invalid IPv4 address (expected a.b.c.d)');
    }
  });
});

describe('parseNetmask', () => {
  it('accepts contiguous netmasks and reports the prefix', () => {
    expect(parseNetmask('255.255.255.192')).toEqual({ ok: true, prefix: 26 });
    expect(parseNetmask('255.255.0.0')).toEqual({ ok: true, prefix: 16 });
    expect(parseNetmask('0.0.0.0')).toEqual({ ok: true, prefix: 0 });
    expect(parseNetmask('255.255.255.255')).toEqual({ ok: true, prefix: 32 });
  });

  it('rejects non-contiguous netmasks', () => {
    const failure = parseNetmask('255.0.255.0');
    expect(failure.ok).toBe(false);
    if (!failure.ok) expect(failure.error).toBe('Netmask must be contiguous');
  });

  it('rejects non-IPv4 netmasks', () => {
    const failure = parseNetmask('300.0.0.0');
    expect(failure.ok).toBe(false);
    if (!failure.ok) expect(failure.error).toBe('Invalid netmask (expected a.b.c.d)');
  });
});

describe('analyzeIpv4', () => {
  it('analyzes a /26 CIDR', () => {
    const result = analyzeIpv4('192.168.1.130/26');
    if (!result.ok) throw new Error('expected ok');
    expect(result.analysis).toEqual({
      prefix: 26,
      network: '192.168.1.128',
      broadcast: '192.168.1.191',
      netmask: '255.255.255.192',
      wildcard: '0.0.0.63',
      firstHost: '192.168.1.129',
      lastHost: '192.168.1.190',
      totalAddresses: 64,
      usableHosts: 62,
      addressInRange: true,
    });
  });

  it('treats a network or broadcast address as not a usable host', () => {
    const network = analyzeIpv4('192.168.1.128/26');
    if (!network.ok) throw new Error('expected ok');
    expect(network.analysis.addressInRange).toBe(false);
    const broadcast = analyzeIpv4('192.168.1.191/26');
    if (!broadcast.ok) throw new Error('expected ok');
    expect(broadcast.analysis.addressInRange).toBe(false);
  });

  it('reports null host fields for /31', () => {
    const result = analyzeIpv4('10.0.0.5/31');
    if (!result.ok) throw new Error('expected ok');
    expect(result.analysis.prefix).toBe(31);
    expect(result.analysis.firstHost).toBeNull();
    expect(result.analysis.lastHost).toBeNull();
    expect(result.analysis.usableHosts).toBeNull();
    expect(result.analysis.network).toBe('10.0.0.4');
    expect(result.analysis.broadcast).toBe('10.0.0.5');
  });

  it('analyzes /32 as a single address in range', () => {
    const result = analyzeIpv4('10.0.0.7/32');
    if (!result.ok) throw new Error('expected ok');
    expect(result.analysis.totalAddresses).toBe(1);
    expect(result.analysis.addressInRange).toBe(true);
    expect(result.analysis.network).toBe('10.0.0.7');
    expect(result.analysis.broadcast).toBe('10.0.0.7');
    expect(result.analysis.firstHost).toBeNull();
  });

  it('treats a bare address as /32', () => {
    const result = analyzeIpv4('10.0.0.7');
    if (!result.ok) throw new Error('expected ok');
    expect(result.analysis.prefix).toBe(32);
    expect(result.analysis.netmask).toBe('255.255.255.255');
    expect(result.analysis.totalAddresses).toBe(1);
  });

  it('accepts a space-separated dotted netmask', () => {
    const result = analyzeIpv4('10.0.0.7 255.255.0.0');
    if (!result.ok) throw new Error('expected ok');
    expect(result.analysis.prefix).toBe(16);
    expect(result.analysis.network).toBe('10.0.0.0');
    expect(result.analysis.broadcast).toBe('10.0.255.255');
    expect(result.analysis.usableHosts).toBe(65534);
  });

  it('accepts a slash-separated dotted netmask', () => {
    const result = analyzeIpv4('10.0.0.7/255.255.0.0');
    if (!result.ok) throw new Error('expected ok');
    expect(result.analysis.prefix).toBe(16);
    expect(result.analysis.netmask).toBe('255.255.0.0');
  });

  it('supports the netmask-only form with no address', () => {
    const result = analyzeIpv4('255.255.255.0 /24');
    if (!result.ok) throw new Error('expected ok');
    expect(result.analysis.prefix).toBe(24);
    expect(result.analysis.network).toBe('0.0.0.0');
    expect(result.analysis.broadcast).toBe('0.0.0.255');
    expect(result.analysis.addressInRange).toBeNull();
  });

  it('treats 0.0.0.0 addresses as unspecified (addressInRange null)', () => {
    const result = analyzeIpv4('0.0.0.0/24');
    if (!result.ok) throw new Error('expected ok');
    expect(result.analysis.network).toBe('0.0.0.0');
    expect(result.analysis.broadcast).toBe('0.0.0.255');
    expect(result.analysis.addressInRange).toBeNull();
  });

  it('reports the full /0 range', () => {
    const result = analyzeIpv4('0.0.0.0/0');
    if (!result.ok) throw new Error('expected ok');
    expect(result.analysis.totalAddresses).toBe(4294967296);
    expect(result.analysis.usableHosts).toBe(4294967294);
    expect(result.analysis.netmask).toBe('0.0.0.0');
    expect(result.analysis.wildcard).toBe('255.255.255.255');
  });

  it('rejects invalid inputs', () => {
    expect(analyzeIpv4('256.1.1.1/24').ok).toBe(false);
    expect(analyzeIpv4('10.0.0.1/33').ok).toBe(false);
    if (!analyzeIpv4('10.0.0.1/33').ok) {
      expect(analyzeIpv4('10.0.0.1/33')).toEqual({
        ok: false,
        error: 'Prefix length must be between 0 and 32',
      });
    }
    expect(analyzeIpv4('10.0.0.1 255.0.255.0').ok).toBe(false);
    expect(analyzeIpv4('10.0.0.1/x').ok).toBe(false);
    expect(analyzeIpv4('10.0.0.1/2/3').ok).toBe(false);
    expect(analyzeIpv4('')).toEqual({ ok: false, error: 'Enter an IPv4 address or CIDR range' });
  });

  it('exposes the canonical placeholder', () => {
    expect(CIDR_INPUT_PLACEHOLDER).toBe('192.168.1.130/26');
  });
});
