# shine_api — REST API

Node.js/TypeScript backend for AURAE. Serves both the public dress marketplace and the authenticated boutique-owner Wardrobe (inventory, bookings, damage incidents).

Monorepo context and the `user_dresses` data model rule: `../CLAUDE.md`.
Enforceable conventions: `.claude/rules/` · Deep references: `docs/`

**Base URL:** `/api/v1` · **Port:** 4941 (`PORT` env var)

---

## Stack

Express 4 · TypeScript 5 (`noImplicitAny`) · PostgreSQL (no ORM, raw parameterized SQL) · Supabase Auth · Cloudflare R2 · AJV validation · Winston · Multer (memory storage) · Nodemon + ts-node

---

## Architecture

```
Routes → Middleware (upload → auth → validation) → Controllers → Repositories → PostgreSQL
```

Controllers own business logic and transactions. Repositories own SQL and the snake_case ↔ camelCase mapping. Neither layer skips the other.

```
src/
├── server.ts              Entry point — DB connect, server start
├── config/                express.ts (CORS, middleware, routes, error handler), db.ts (pool), supabase.ts, logger
└── app/
    ├── routes/            base, userAuth, user, dress
    ├── middlewares/       supabaseAuthenticateReq, optionalSupabaseAuth, validateRequestBody
    ├── controllers/       cart, dress, dressDamageIncident, rentalBooking, user, watchlist
    ├── repositories/      one folder per domain + mapXDbToObject.ts mappers
    ├── utils/             cloudflare/, errors/, database/, validation/, asyncHandler, multerStorage
    └── resources/         types.ts, ajvSchema.json, constants.ts
```

---

## Design Decisions

**Supabase Auth is the source of truth for credentials.** PostgreSQL never stores passwords. User rows are synced to Postgres purely for relational queries.

**Two Supabase clients, non-interchangeable.** `supabaseAuth` (anon key) for signin/signout/password reset/refresh. `supabaseAdmin` (service role) for user creation, deletion, token verification.

**Multi-client token strategy.** Web clients get httpOnly cookies; Flutter clients get tokens in the response body. Detected via the `x-client-type` header.

**No ORM.** Raw SQL with `convertQueryPlaceholders` translating legacy MySQL `?` placeholders to PostgreSQL `$1`. Multi-step writes use explicit BEGIN/COMMIT/ROLLBACK on a dedicated connection.

**Two-tier validation.** AJV handles request structure and types; controllers handle business rules (ownership, state transitions). AJV runs with `removeAdditional: 'all'`.

**Upload-then-rollback for images.** Files go to R2 first; if the DB write fails, the uploaded objects are deleted. R2 object keys are `aurae/{timestamp}-{random}-{sanitized-filename}` (`utils/cloudflare/r2Client.ts`).

**Multer is memory storage, applied per-route** — `uploadMulter` from `utils/multerStorage.ts`, not a global middleware. Dress photos allow 10 files (`uploadMulter.array('images', 10)`), damage incident photos 5, profile image 1 (`.single('image')`).

---

## Routes

| File | Covers |
|---|---|
| `userAuth.routes.ts` | signup, signin, signout, refresh-token |
| `user.routes.ts` | profile, password, watchlist, cart, `PATCH /user/settings` (business settings) |
| `dress.routes.ts` | public browse `/dresses`, `/dresses/attributes`, `/dresses/:id`, `/dresses/:id/damage-incidents`, owner wardrobe `/user/dresses` + nested bookings |

`GET /dresses` supports `userId`, `brand`, `style`, `size`, `color`, `condition`, `dressType`, `location`, `priceFrom`, `priceTo`, `search`, `sortBy`, plus date-availability filtering and pagination.

Full endpoint reference: `docs/api-endpoints.md`.

---

## Booking Validation — One Shared Check

All three booking write paths — owner-created, renter self-book, and owner date edits — go through **`hasBookingConflict` in `repositories/rentalBookingRepository/dressBookingRepository.ts`**. It validates against existing bookings, the business-wide cleaning buffer, and the dress's `blocked_date_ranges` in one place.

**Never add a fourth booking write path with its own validation.** `postBooking.ts` previously had zero conflict checking; this consolidation is what fixed it.

The cleaning buffer lives in `user.business_settings.cleaningBufferDays` (JSONB, min 1, default 1) — business-wide, not per-dress. `PATCH /user/settings` **merges** into that blob rather than replacing it.

---

## Commands

```bash
npm run dev        # nodemon + ts-node from src/
npm run build      # tslint --fix, then tsc → dist/
npm start          # build + run
npm run prebuild   # lint only
```

**After any change to `src/`, run `npm run build`.** Production serves from `dist/`; a stale `dist/` means your change silently doesn't exist.

### Environment

Copy `.env.example` → `.env`: PostgreSQL credentials, Supabase URL + service-role and anon keys, Cloudflare R2 credentials + bucket, and `ALLOWED_COOKIE_ORIGINS` (comma-separated — must include `http://localhost:8080` for the Flutter web client).

---

## Deep References (`docs/`)

`api-endpoints.md` · `database-schema.md` · `authentication-flow.md` · `transaction-patterns.md` · `repository-patterns.md` · `validation-schema-guide.md` · `error-handling-guide.md` · `supabase-integration.md` · `cloudflare-r2-integration.md` · `testing-strategy.md`

R2 bucket configuration: `CLOUDFLARE_R2_SETUP.md`.

---

## Known Issues

- **No automated test suite.** See `docs/testing-strategy.md` for the intended approach.
- **`motorix-api.yaml`** in the repo root is a stale OpenAPI spec from the pivot — not maintained, don't treat it as a contract.
- **Cosmetic `vehicle*` naming** survives in `resources/types.ts` (`vehicleIdFk`) and as local variables in `dressController/`. Harmless; rename opportunistically.
