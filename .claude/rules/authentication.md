# Authentication Rules

## Hard Rules

1. **NEVER store passwords in PostgreSQL**
   - Supabase Auth is the ONLY credential store
   - User table has NO password field

2. **NEVER use supabaseAdmin for signin**
   - Use `supabaseAuth` for: signin, signout, password reset, token refresh
   - Use `supabaseAdmin` for: user creation, deletion, token verification

3. **NEVER expose service role key**
   - Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only
   - Never include in responses or client code

4. **NEVER skip auth middleware on protected routes**
   - All routes modifying user data MUST use `supabaseAuthenticateReq`
   - Public routes with personalization use `optionalSupabaseAuth`

5. **NEVER trust client-provided currentUserId**
   - Auth middleware injects `currentUserId` from verified JWT
   - AJV validates it as UUID format
   - Never accept userId from request body/params for auth purposes

## Correct Patterns

```typescript
// Signin - use supabaseAuth
const { data, error } = await supabaseAuth.auth.signInWithPassword({
  email, password
});

// Token verification - use supabaseAdmin
const { data, error } = await supabaseAdmin.auth.getUser(token);

// User creation - use supabaseAdmin
await supabaseAdmin.auth.admin.createUser({ email, password });
```

## Multi-Client Token Handling

```typescript
// Web clients - httpOnly cookies
res.cookie('sb-access-token', accessToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});

// Flutter clients - response body
if (req.headers['x-client-type'] === 'flutter') {
  res.send({ accessToken, refreshToken });
}
```
