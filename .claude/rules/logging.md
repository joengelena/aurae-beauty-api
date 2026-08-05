# Logging Rules

Winston logger, default export from `src/config/logger.ts`. Import it as `logger`.

## Hard Rules

1. **NEVER use `console.log`/`console.error`.** There are currently zero in `src/` — keep it that way. Winston writes to the console *and* to `logs/app.log` + `logs/error.log`; `console` skips the files.

2. **NEVER log credentials or tokens.** Not passwords (plaintext or hashed), not access/refresh tokens, not JWTs, not the Supabase service role key.

3. **NEVER log a raw request body from an auth route.** `signInUser`, `signUpUser`, `updateUserPassword`, and `resetPassword` all carry a password field. Anything logging `req.body` must pass it through `redactSensitiveFields` first — see the global error handler in `config/express.ts`.

4. **NEVER return what you log.** Log the detail server-side, return a generic `AppError` message to the client. See `error-responses.md`.

## Levels

The logger defines a custom level set: `error` (0), `warn` (1), `info` (2), `http` (3), `debug` (4).

| Level | Use for |
|---|---|
| `error` | Unexpected failures needing investigation — DB failures, unhandled exceptions, R2 upload failures |
| `warn` | Security and anomaly events — failed auth, ownership check rejections, booking conflicts |
| `info` | Significant business events — user signed in, dress created, booking confirmed |
| `http` | Request tracing (the request middleware in `express.ts` uses this) |
| `debug` | Development detail — never leave noisy debug logging in a merged controller |

## What's Safe to Log

**Safe:** user IDs (UUIDs), dress/booking IDs, HTTP status codes, endpoint paths, timestamps, error messages, IP addresses for security events.

**Not safe:** passwords, tokens, full email addresses in production, full request bodies, R2 credentials, anything from `.env`.

```typescript
// ❌
logger.info(`Login attempt: ${email} / ${password}`);
logger.info(`Token issued: ${accessToken}`);

// ✅
logger.info(`User authenticated: ${user.id}`);
logger.warn(`Failed signin for user id: ${userId}`);
```

Existing code logs refresh *status* rather than token values (`'🔄 Token refresh successful'`). Follow that.

## Always Log Before Rethrowing

The standard controller catch logs the real cause, then throws a user-safe message:

```typescript
} catch (error: any) {
  if (error instanceof AppError) throw error;
  logger.error(`Failed to create booking: ${error.message}`);
  throw new AppError(500, 'Could not create the booking. Please try again.');
}
```

The client sees the second message; the first is what you'll actually debug from.

## ⚠️ Known Trap — The Format Drops Metadata

`config/logger.ts` uses a `printf` format that renders **only** `timestamp`, `status`, `level`, and `message`:

```typescript
winston.format.printf(
  (info) => `${info.timestamp} ${info.status} ${info.level}: ${info.message}`
)
```

Any other field you pass — `stack`, `method`, `path`, `body` — is silently discarded. The global error handler passes all four and none of them reach disk.

**Two consequences, both important:**

- **Stack traces are not being recorded.** The error handler collects `err.stack` and it goes nowhere. If you need it, put it in the `message`.
- **Changing this format is a security-sensitive change.** Switching to `winston.format.json()` or adding metadata rendering would immediately start writing every field the error handler passes — which is why `body` is redacted at the call site rather than relying on the format to swallow it. Do not remove that redaction on the grounds that "the format drops it anyway."

If you fix the format to render metadata (worth doing — losing stack traces is bad), verify `redactSensitiveFields` still covers every sensitive key in `ajvSchema.json` first.
