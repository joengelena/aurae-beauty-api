# AURAE API

RESTful backend for the AURAE dress rental marketplace.

## Authentication

- Routes: `/api/v1/user/*`
- Supabase Auth for user management (passwords never stored in PostgreSQL)
- HttpOnly cookies for web clients; tokens in response body for Flutter (`X-Client-Type: flutter`)

## Folder Structure

### Routes

Define API endpoints, URL paths, HTTP methods, and middleware chains.

### Middleware

Request validation and security before controllers:

- Auth (Supabase JWT verification)
- Input validation (AJV schema)
- File upload (Multer)

### Controllers

Business logic layer — one file per operation. Orchestrate repositories, manage transactions, return responses.

### Repositories

Database CRUD operations. Abstract SQL queries, map snake_case ↔ camelCase.

### Utils

Cloudflare R2 upload, error classes, async handler, query placeholder conversion.

### Config

Database pool, Supabase clients (admin + auth), Winston logger, Express app setup.

## Security Flow

All private routes require Supabase JWT verification via `supabaseAuthenticateReq` middleware. The middleware extracts and injects `currentUserId` into `req.body` — controllers never trust a user ID provided by the client.

## Getting Started

1. Copy `.env.example` to `.env`
2. Configure PostgreSQL credentials
3. Add Supabase URL + keys (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`)
4. Configure Cloudflare R2 (see `CLOUDFLARE_R2_SETUP.md`)
5. Set `ALLOWED_COOKIE_ORIGINS` (comma-separated, must include Flutter app origin)

```bash
npm install
npm run dev     # Development with hot reload (ts-node)
npm run build   # Compile TypeScript to dist/
npm start       # Build then run from dist/
```

## Summary

- Clean layered architecture (Routes → Middleware → Controllers → Repositories)
- PostgreSQL with explicit transactions for multi-step operations
- Cloudflare R2 for image storage (never local filesystem)
- Dual Supabase clients: `supabaseAdmin` for backend operations, `supabaseAuth` for signin
