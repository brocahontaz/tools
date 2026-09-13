# Tools

Local-first developer utilities — twelve small tools that run entirely in your browser.
No accounts, no analytics, no server-side storage: your input never leaves the page.

## Quick start

```sh
npm install && npm run dev
```

## Scripts

| Script                 | Purpose                       |
| ---------------------- | ----------------------------- |
| `npm run dev`          | Start the Vite dev server     |
| `npm run build`        | Production build (multi-page) |
| `npm run preview`      | Preview the production build  |
| `npm run typecheck`    | TypeScript, no emit           |
| `npm test`             | Vitest suites                 |
| `npm run lint`         | ESLint                        |
| `npm run format`       | Prettier (write)              |
| `npm run format:check` | Prettier (check only)         |

## Docker

Build and run the production image (nginx serves the static build on port 8080):

```sh
docker compose up --build
# or
docker build -t tools-utilities:local .
docker run --rm -p 8080:8080 tools-utilities:local
```

Then open <http://localhost:8080>.

## CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint, format check,
typecheck, tests and build on every push and pull request. Pushes to `main` and
`v*` tags additionally publish the container image to
`ghcr.io/brocahontaz/tools` — `latest` from `main`, `X.Y.Z` from version tags
and a `sha-` commit tag. Images are never published from pull requests.

## Privacy

Every tool runs entirely client-side in your browser via standard web APIs
(Web Crypto among them). There are no accounts, no database, no analytics, no
telemetry and no server-side history: your input never leaves the page.

## Security

- The JWT tool decodes tokens only — it does **not** verify signatures.
- Random strings and passwords use `crypto.getRandomValues`; UUIDs use
  `crypto.randomUUID`. Both are cryptographically secure sources.

## Tools

- **jwt** — JWT decoder — decode and inspect header, payload and claims
- **base64** — Encode and decode Base64 and Base64URL text
- **url** — Percent-encode and decode URLs and URI components
- **uuid** — Generate random UUID version 4 identifiers
- **hash** — SHA-256 / SHA-384 / SHA-512 hash of text
- **hmac** — Sign text with HMAC using a shared secret key
- **json** — Format, validate and minify JSON
- **yaml** — Convert between JSON and YAML
- **timestamp** — Convert Unix timestamps to and from dates
- **random** — Secure random strings and passwords
- **diff** — Compare two texts and highlight the differences
- **cidr** — IPv4 CIDR and subnet helper
