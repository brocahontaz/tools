export interface ToolMeta {
  id: string;
  path: string;
  name: string;
  description: string;
}

/** Single source of truth for the tools listed in the nav and on the home page. */
export const TOOLS: readonly ToolMeta[] = [
  {
    id: 'jwt',
    path: '/jwt',
    name: 'JWT decoder',
    description: 'Decode and inspect header, payload and claims',
  },
  {
    id: 'base64',
    path: '/base64',
    name: 'Base64 / Base64URL',
    description: 'Encode and decode Base64 and Base64URL text',
  },
  {
    id: 'url',
    path: '/url',
    name: 'URL encode / decode',
    description: 'Percent-encode and decode URLs and URI components',
  },
  {
    id: 'uuid',
    path: '/uuid',
    name: 'UUID v4 generator',
    description: 'Generate random UUID version 4 identifiers',
  },
  {
    id: 'hash',
    path: '/hash',
    name: 'Hash',
    description: 'SHA-256 / SHA-384 / SHA-512 hash of text',
  },
  {
    id: 'hmac',
    path: '/hmac',
    name: 'HMAC signer',
    description: 'Sign text with HMAC using a shared secret key',
  },
  {
    id: 'json',
    path: '/json',
    name: 'JSON formatter',
    description: 'Format, validate and minify JSON',
  },
  {
    id: 'yaml',
    path: '/yaml',
    name: 'JSON ↔ YAML',
    description: 'Convert between JSON and YAML',
  },
  {
    id: 'timestamp',
    path: '/timestamp',
    name: 'Unix timestamp',
    description: 'Convert Unix timestamps to and from dates',
  },
  {
    id: 'random',
    path: '/random',
    name: 'Random generator',
    description: 'Secure random strings and passwords',
  },
  {
    id: 'diff',
    path: '/diff',
    name: 'Text diff',
    description: 'Compare two texts and highlight the differences',
  },
  {
    id: 'cidr',
    path: '/cidr',
    name: 'IPv4 CIDR',
    description: 'IPv4 CIDR and subnet helper',
  },
];

export const TOOLS_BY_ID: ReadonlyMap<string, ToolMeta> = new Map(
  TOOLS.map((tool) => [tool.id, tool]),
);
