# AURAE API

## Project Overview

- RESTful backend for dress rental marketplace with business owner inventory management
- Dual-purpose: public marketplace + authenticated business owner dress wardrobe tracking with rental bookings
- Tech: Node.js/TypeScript, Express, PostgreSQL, Supabase Auth, Cloudflare R2 (images)
- Multi-client support: Web (httpOnly cookies) + Flutter (tokens in response body)
- Migrated from MySQL to PostgreSQL (legacy `?` placeholders converted to `$1` style)

## Tech Stack

**Core**: Express 4, TypeScript 5, PostgreSQL, Node.js
**Auth**: Supabase (dual clients: admin + auth)
**Storage**: Cloudflare R2 (S3-compatible)
**Validation**: AJV (JSON Schema)
**Logging**: Winston
**File Upload**: Multer (memory storage)
**Dev**: Nodemon + ts-node

## Architecture

### Layered Structure
```
Routes → Middleware (auth, validation, upload) → Controllers → Repositories → Database
```

### Request Lifecycle
1. CORS + Body parsers + Cookie parser
2. Route matching (`/api/v1/*`)
3. File upload (if needed) → Auth middleware → Validation middleware
4. Controller (business logic + transaction management)
5. Repository (database operations with connection pooling)
6. Error handler (global catch-all)

### Folder Organization
- `config/` - Express app, DB pool, Supabase clients, Winston logger
- `routes/` - API endpoint definitions + middleware chains
- `middlewares/` - Auth verification, AJV validation, file upload
- `controllers/` - One file per operation, transaction orchestration
- `repositories/` - Database CRUD + data mapping (snake_case ↔ camelCase)
- `utils/` - Cloudflare R2, error classes, async handler, database helpers
- `resources/` - TypeScript types + AJV schemas + constants

## Design Decisions & Constraints

### Authentication Architecture
- **Supabase Auth is the source of truth** for user credentials (never store passwords in PostgreSQL)
- **Dual Supabase clients**: `supabaseAdmin` (service role) for backend operations, `supabaseAuth` (anon key) for signin
- **Multi-client token strategy**: Web clients get httpOnly cookies, Flutter clients get tokens in response (detect via `X-Client-Type: flutter` header)
- User data synced to PostgreSQL for relational queries (listings, vehicles, etc.)

### Database Strategy
- **PostgreSQL with explicit transactions** for multi-step operations (BEGIN/COMMIT/ROLLBACK pattern)
- **Connection pooling** (max 100 connections) with optional connection parameter for transaction support
- **No ORM** - raw SQL queries with placeholder conversion (`convertQueryPlaceholders`)
- **CASCADE deletions** configured at DB level (e.g., user deletion cascades to dresses/bookings)
- **⚠️ DB NEEDS MIGRATION**: Current tables still use vehicle terminology (user_vehicles, vehicle_service)

### Image Storage Pattern
- **Cloudflare R2** for scalability (not local filesystem)
- **Upload-then-rollback**: Images uploaded first, deleted if DB operation fails
- **Key format**: `motorix/{timestamp}-{random}-{sanitized-filename}`
- **Validation**: Max 10 files, 10MB each, JPEG/PNG/WebP/HEIC only

### Validation Philosophy
- **Two-tier validation**: AJV for schema (request structure/types), controllers for business rules (ownership, state)
- **Auto-sanitization**: AJV configured with `removeAdditional: 'all'` to strip unknown properties
- **currentUserId injection**: Auth middleware injects `currentUserId` into req.body (validated as UUID in schemas)

## Coding Conventions

### Naming
- **Files/folders**: camelCase (`userController/`, `supabaseAuthenticateReq.ts`)
- **Variables/functions**: camelCase (`getUserById`, `currentUserId`)
- **Types/interfaces**: PascalCase (`User`, `Listing`, `ListingQueryParams`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `FALSE`)
- **Database columns**: snake_case (`user_id_fk`, `first_name`, `created_at`)

### File Organization
- **Controllers**: One file per operation (Single Responsibility), index file exports all
- **Repositories**: All CRUD in single file + separate mapper file (`mapUserDbToObject.ts`)
- **Import order**: 1) External deps, 2) Local utils/types, 3) Repositories

### Error Handling
```typescript
// Standard pattern
try {
  // operation
} catch (error: any) {
  if (error instanceof AppError) throw error;
  logger.error(`Unexpected error: ${error.message}`);
  throw new AppError(500, 'User-friendly message');
}
```
**Status codes**: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 500 (Server Error)

### Transaction Pattern
```typescript
const connection = await getPool().connect();
try {
  await connection.query('BEGIN');
  // Multiple repository operations with connection parameter
  await repo.operation(data, connection);
  await connection.query('COMMIT');
  connection.release();
} catch (error) {
  await connection.query('ROLLBACK');
  connection.release();
  throw error;
}
```

### TypeScript Usage
- `noImplicitAny: true` (strict typing enforced)
- Centralized types in `resources/types.ts`
- Explicit return types on async functions: `Promise<void>` for controllers, `Promise<User[]>` for repos

## Never Do

### Authentication & Security
- **NEVER store passwords in PostgreSQL** - Supabase Auth handles all credential storage
- **NEVER use supabaseAdmin for signin** - only use `supabaseAuth` client for authentication
- **NEVER expose service role key** to client or in responses
- **NEVER skip auth middleware** on routes that modify user data
- **NEVER trust `currentUserId` from client** - always injected by auth middleware (validated UUID)

### Database Operations
- **NEVER write raw SQL with string interpolation** - always use parameterized queries with placeholder conversion
- **NEVER use connection pool directly for transactions** - use `getPool().connect()` for manual connection management
- **NEVER forget to release connections** - always release in finally block or after operations
- **NEVER skip transaction wrapper** for multi-step operations (listing + photos, user + profile, etc.)

### File Uploads & Storage
- **NEVER store images in local filesystem** - Cloudflare R2 only
- **NEVER skip file validation** before upload (size, type, count)
- **NEVER leave orphaned R2 objects** - delete uploaded files if DB operation fails
- **NEVER process files without Multer middleware** - file validation assumes Multer has run

### Code Quality
- **NEVER create separate files for simple operations** - one file per operation in controllers
- **NEVER bypass AJV validation** - all request bodies must have schema
- **NEVER use `var`** - prefer `const`, then `let` (enforced by tslint)
- **NEVER skip data mapping** - DB snake_case must be converted to camelCase for API responses
- **NEVER commit without linting** - `npm run prebuild` runs tslint auto-fix

### API Design
- **NEVER return database errors to client** - wrap in AppError with user-friendly message
- **NEVER log sensitive data** (passwords, tokens) - only log error messages and user IDs
- **NEVER change base URL** - `/api/v1` is hardcoded across clients
- **NEVER skip `additionalProperties: false`** in AJV schemas - prevents injection attacks

## Key Files & Entry Points

### Critical Path
1. `src/server.ts` - Entry point, DB connection, server start
2. `src/config/express.ts` - App setup, CORS, middleware, routes, global error handler
3. `src/config/db.ts` - PostgreSQL connection pool
4. `src/config/supabase.ts` - Dual Supabase client initialization

### Route Definitions
- `src/app/routes/userAuth.routes.ts` - Signup, signin, signout, refresh token
- `src/app/routes/user.routes.ts` - Profile, password, watchlist management
- `src/app/routes/listing.routes.ts` - Marketplace dress listings (CRUD + search)
- `src/app/routes/dress.routes.ts` - ✅ Business owner dress wardrobe + rental bookings (RENAMED from vehicle.routes.ts)

### Core Middleware
- `src/app/middlewares/supabaseAuthenticateReq.ts` - JWT verification, userId injection (required auth)
- `src/app/middlewares/optionalSupabaseAuth.ts` - Optional auth (public routes with personalization)
- `src/app/middlewares/validateRequestBody.ts` - AJV schema validation

### Utilities
- `src/app/utils/asyncHandler.ts` - Async error wrapper for Express routes
- `src/app/utils/errors/appError.ts` - Custom error class with HTTP status
- `src/app/utils/cloudflare/uploadImages.ts` - R2 upload orchestration
- `src/app/utils/database/convertQueryPlaceholders.ts` - MySQL `?` → PostgreSQL `$1` conversion

### Configuration
- `src/app/resources/types.ts` - All TypeScript type definitions
- `src/app/resources/ajvSchema.json` - Request validation schemas (referenced by name in middleware)
- `src/app/resources/constants.ts` - Application constants (currently just `FALSE = 0`)

## Common Commands

```bash
# Development (hot reload)
npm run dev

# Build (runs tslint --fix, then compiles TypeScript)
npm run build

# Production (builds then runs)
npm start

# Lint only
npm run prebuild
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure PostgreSQL credentials
3. Add Supabase URL + keys (service role + anon)
4. Configure Cloudflare R2 credentials + bucket name
5. Set `ALLOWED_COOKIE_ORIGINS` (comma-separated)

## Additional Context

### Database Schema
- **No migration files** - schema managed outside this codebase
- **⚠️ NEEDS UPDATE**: Tables still use vehicle terminology: `user_vehicles`, `vehicle_service`
- **Target tables**: `user_dresses`, `dress_bookings` (or `rental_bookings`)
- Other tables: `user`, `listing`, `listing_photo`, `watchlist`
- See @docs/database-schema.md for full schema reference

### Cloudflare R2 Setup
- See `CLOUDFLARE_R2_SETUP.md` in repo root for bucket configuration
- Public access configured via custom domain or R2.dev URL

### Client Integration
- Web clients: Expect `sb-access-token` and `sb-refresh-token` httpOnly cookies
- Flutter clients: Send `X-Client-Type: flutter` header, get tokens in response body

---

**Base URL**: `/api/v1`
**Port**: 4941 (configurable via `PORT` env var)
