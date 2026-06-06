# Building & Signing the Firefox Extension (Personal Use)

## Prerequisites

- Node.js, Yarn
- AMO API credentials (JWT issuer + secret) from https://addons.mozilla.org/en-US/developers/addon/api/key/

## Local Credential Storage

Store AMO credentials in the local-only file `.env.signing.local`:

```bash
AMO_JWT_ISSUER="your-amo-jwt-issuer"
AMO_JWT_SECRET="your-amo-jwt-secret"
```

Use `.env.signing.example` as the template. The real `.env.signing.local` is git-ignored.

## Build (Production)

```bash
yarn build:firefox:all:self-sign
```

This outputs to `build/firefox-signed/`. **Must be production** — dev builds produce JS files >5MB which AMO rejects (`FILE_TOO_LARGE`).

## Sign

```bash
yarn sign:firefox
```

The signed `.xpi` will be saved to `web-ext-artifacts/`.

### Important Notes

- Uses `web-ext@latest` via `npx` (avoids Windows zip upload bug in bundled v8.3.0).
- Signs with `--channel=unlisted` — personal use, not public AMO listing.
- AMO warnings about `DANGEROUS_EVAL` and `MISSING_DATA_COLLECTION_PERMISSIONS` are expected and non-blocking.
- `yarn sign:firefox` reads credentials from `.env.signing.local` or from `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` environment variables.

## Install

1. Firefox → `about:addons` → ⚙️ → **Install Add-on From File...**
2. Select the `.xpi` from `web-ext-artifacts/`

## Re-signing After Code Changes

Bump the version in `package.json` each time before signing. AMO requires a unique version per upload — you cannot re-sign the same version number.
