# Security Rules

## Hard Rules

1. **NEVER expose SUPABASE_SERVICE_ROLE_KEY**
   - Server-side only
   - Never in responses, logs, or client code
   - Grants full admin access to Supabase

2. **NEVER trust client-provided user IDs for authorization**
   ```typescript
   // WRONG - trusting client
   const userId = req.body.userId;

   // CORRECT - from verified JWT
   const userId = req.body.currentUserId;  // Injected by auth middleware
   ```

3. **NEVER skip ownership validation**
   ```typescript
   const listing = await listingRepository.getListingById(id);

   if (listing[0].userIdFk !== currentUserId) {
     throw new AppError(403, 'Not authorized');
   }
   ```

4. **NEVER use string interpolation in SQL**
   ```typescript
   // WRONG - SQL injection
   `SELECT * FROM "user" WHERE id = '${id}'`

   // CORRECT - parameterized
   convertQueryPlaceholders('SELECT * FROM "user" WHERE id = ?')
   ```

5. **NEVER allow additionalProperties in schemas**
   - Prevents injection of unexpected fields
   - Always set `"additionalProperties": false`

## CORS Configuration

```typescript
// Only allow specific origins
const allowedOrigins = process.env.ALLOWED_COOKIE_ORIGINS.split(',');

app.use(cors({
  origin: allowedOrigins,
  credentials: true  // For cookies
}));
```

## Cookie Security

```typescript
res.cookie('sb-access-token', token, {
  httpOnly: true,     // No JavaScript access
  secure: true,       // HTTPS only
  sameSite: 'strict', // CSRF protection
  maxAge: 3600000     // 1 hour
});
```

## Input Validation

1. AJV schema validates structure/types
2. Controller validates business rules
3. Never trust: file extensions, content-type headers (validate buffer)

## Sensitive Data

**Never log:**
- Passwords (plain or hashed)
- JWT tokens
- Refresh tokens
- Service role keys
- Full request bodies with credentials
