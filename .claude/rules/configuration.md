# Configuration Rules

All runtime configuration comes from environment variables, loaded by `dotenv` in `server.ts`.

## Hard Rules

1. **NEVER commit `.env`.** Only `.env.example`. `.env` is gitignored — keep it that way.

2. **NEVER add an env var without adding it to `.env.example`.** A variable that only exists on your machine is a broken deploy for everyone else. Use a placeholder value, never a real credential.

3. **NEVER read `process.env` inside a controller or repository.** Config belongs at the edges — `config/` or a dedicated module like `utils/cloudflare/config.ts`. A controller reaching into `process.env` is config logic hiding in business logic.

4. **NEVER let a missing required variable fail silently.** Validate at startup and throw. An `undefined` that surfaces as a confusing 500 on the first request is far worse than a clear crash on boot.

## The Pattern to Follow

`utils/cloudflare/config.ts` already does this correctly — copy its shape:

```typescript
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const r2Config: IR2Config = {
  accountId: getRequiredEnvVar('R2_ACCOUNT_ID'),
  accessKeyId: getRequiredEnvVar('R2_ACCESS_KEY_ID'),
  // ...
};
```

Validated once at module load, exported as a typed object, consumed everywhere else as `r2Config.accountId`. New config groups should look like this.

## Current Variables

Complete list is `.env.example`. Grouped:

| Group | Variables |
|---|---|
| Server | `NODE_ENV`, `PORT` (default 4941) |
| Postgres | `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE` |
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` |
| Cloudflare R2 | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_DOMAIN` (optional) |
| CORS / redirects | `ALLOWED_COOKIE_ORIGINS`, `EMAIL_VERIFICATION_REDIRECT_URL`, `PASSWORD_RESET_REDIRECT_URL` |

### `ALLOWED_COOKIE_ORIGINS`

Comma-separated. **Must include `http://localhost:8080`** — the Flutter web client only works on port 8080, and cookie auth fails on any other origin. If the list is empty, `express.ts` falls back to `origin: true` (allow all), which is fine locally and wrong in production.

### Secrets

`SUPABASE_SERVICE_ROLE_KEY` grants full admin access to Supabase and `R2_SECRET_ACCESS_KEY` grants write access to the image bucket. Neither may appear in a response, a log line, or client-side code. See `security.md` and `logging.md`.

## Known Gaps

- **No central env module.** `process.env` is read directly in ~10 files including several `userController/` files. Postgres and Supabase config are not validated at startup the way R2 is — a missing `SUPABASE_URL` surfaces as a runtime failure on first auth instead of a boot error. Consolidating into `config/env.ts` on the `getRequiredEnvVar` pattern would fix this.
- **`.env.example` still reads `R2_BUCKET_NAME=motorix-images`** — a pivot leftover. Harmless as a placeholder, but confusing.
