# Authentication Flow

## Overview

Motorix API uses **Supabase Auth** as the single source of truth for authentication. User credentials (email, password) are stored and managed by Supabase, while user profile data is synced to PostgreSQL for relational queries.

## Key Principles

1. **Never store passwords in PostgreSQL** - Supabase Auth handles all credential storage
2. **Dual Supabase clients** - Admin client for backend operations, Auth client for user authentication
3. **Multi-client token strategy** - Web clients use httpOnly cookies, Flutter clients receive tokens in response body
4. **JWT verification** - All protected routes verify JWT tokens via Supabase
5. **User ID injection** - Middleware injects `currentUserId` into request body after token verification

---

## Supabase Client Architecture

### Admin Client (Service Role)
```typescript
// config/supabase.ts
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

**Usage**:
- User creation during signup
- User deletion
- Admin operations requiring elevated privileges
- NEVER use for signin (security risk)

### Auth Client (Anon Key)
```typescript
// config/supabase.ts
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
```

**Usage**:
- User signin
- Password reset requests
- Token refresh
- Public authentication operations

---

## Sign Up Flow

```
1. Client sends signup request
   POST /api/v1/user/signup
   {
     "email": "user@example.com",
     "password": "securePass123",
     "firstName": "John",
     "lastName": "Doe",
     "phoneNumber": "0212345678",
     "location": "Auckland"
   }

2. Controller (signUpUserSupabase.ts)
   ↓
   a) Create user in Supabase Auth (supabaseAdmin)
      - Returns user.id (UUID)
      - Sends email verification link
   ↓
   b) Sync user to PostgreSQL
      - INSERT INTO "user" (id, first_name, email, ...)
      - Uses same UUID from Supabase
   ↓
   c) Set tokens based on client type
      - Web: Set sb-access-token and sb-refresh-token httpOnly cookies
      - Flutter: Return tokens in response body

3. Client receives success response
   Web: Cookies automatically stored by browser
   Flutter: Client stores tokens for subsequent requests
```

**Email Verification**:
- Supabase sends verification email automatically
- Link redirects to `EMAIL_VERIFICATION_REDIRECT_URL` from env
- User marked as verified in Supabase (not PostgreSQL `is_email_verified` - that's legacy)

**Error Handling**:
- If Supabase creation fails → return 400/409
- If PostgreSQL insert fails → delete Supabase user (rollback) → return 500
- Email already exists → 409 Conflict

---

## Sign In Flow

```
1. Client sends signin request
   POST /api/v1/user/signin
   {
     "email": "user@example.com",
     "password": "securePass123"
   }

2. Controller (signInUserSupabase.ts)
   ↓
   a) Authenticate with Supabase (supabaseAuth.signInWithPassword)
      - Verifies email/password
      - Returns session with access_token and refresh_token
   ↓
   b) Check if header "X-Client-Type: flutter" exists
      - Flutter: Return tokens in response body
      - Web: Set httpOnly cookies
   ↓
   c) Return user data from PostgreSQL
      - Query "user" table by Supabase user.id
      - Return profile information

3. Client receives tokens and user data
```

**Token Storage**:

**Web Clients**:
```typescript
res.cookie('sb-access-token', session.access_token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 3600000 // 1 hour
});

res.cookie('sb-refresh-token', session.refresh_token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 604800000 // 7 days
});
```

**Flutter Clients**:
```json
{
  "message": "Sign in successful",
  "user": { ... },
  "accessToken": "jwt-token-here",
  "refreshToken": "refresh-token-here"
}
```

---

## Protected Route Flow

```
1. Client sends request to protected endpoint
   Web: Cookies sent automatically
   Flutter: Authorization: Bearer {accessToken}

2. Middleware (supabaseAuthenticateReq.ts)
   ↓
   a) Extract token
      - Check cookies for 'sb-access-token'
      - Fallback to Authorization header
   ↓
   b) Verify JWT with Supabase
      const { data, error } = await supabaseAdmin.auth.getUser(token);
   ↓
   c) Inject currentUserId into req.body
      req.body.currentUserId = data.user.id;
   ↓
   d) Continue to next middleware/controller

3. Controller receives request with currentUserId
   - Use currentUserId for ownership checks
   - Never trust user-provided user IDs
```

**Middleware Types**:

**supabaseAuthenticateReq** (required auth):
- Fails if no token or invalid token
- Returns 401 Unauthorized
- Used for: POST, PATCH, DELETE operations

**optionalSupabaseAuth** (optional auth):
- Continues even if no token
- Injects currentUserId if token valid
- Used for: GET /listings (to show watchlist status)

---

## Token Refresh Flow

```
1. Access token expires (1 hour default)
   API returns 401 Unauthorized

2. Client sends refresh request
   POST /api/v1/user/refresh-token
   Cookie: sb-refresh-token={token}
   OR
   Body: { "refreshToken": "token" }

3. Controller (refreshTokenSupabase.ts)
   ↓
   a) Extract refresh token
      - From cookies (web)
      - From body (Flutter)
   ↓
   b) Call Supabase refresh
      const { data } = await supabaseAuth.auth.refreshSession({
        refresh_token: refreshToken
      });
   ↓
   c) Return new tokens
      - Web: Update httpOnly cookies
      - Flutter: Return in response body

4. Client receives new access token
   Continue with original request
```

**Token Lifetimes**:
- Access token: 1 hour (configurable in Supabase)
- Refresh token: 7 days (configurable in Supabase)

---

## Sign Out Flow

```
1. Client sends signout request
   POST /api/v1/user/signout
   (currentUserId injected by middleware)

2. Controller (signOutUserSupabase.ts)
   ↓
   a) Invalidate session in Supabase
      await supabaseAdmin.auth.signOut(token);
   ↓
   b) Clear cookies (web clients)
      res.clearCookie('sb-access-token');
      res.clearCookie('sb-refresh-token');
   ↓
   c) Return success message

3. Client handles signout
   Web: Cookies cleared automatically
   Flutter: Clear stored tokens locally
```

---

## Password Reset Flow

### Request Reset
```
1. Client sends forgot password request
   POST /api/v1/user/forgot-password
   { "email": "user@example.com" }

2. Controller (forgotPasswordSupabase.ts)
   ↓
   Supabase sends password reset email
   await supabaseAuth.auth.resetPasswordForEmail(email, {
     redirectTo: PASSWORD_RESET_REDIRECT_URL
   });

3. User clicks link in email
   Redirected to PASSWORD_RESET_REDIRECT_URL with token
```

### Complete Reset
```
1. Client sends new password with token
   POST /api/v1/user/reset-password
   Authorization: Bearer {reset-token}
   { "newPassword": "newSecurePass456" }

2. Controller (resetPasswordSupabase.ts)
   ↓
   Update password in Supabase
   await supabaseAdmin.auth.updateUser({
     password: newPassword
   });

3. User can now sign in with new password
```

---

## Change Password Flow (Authenticated)

```
1. Client sends change password request
   POST /api/v1/user/change-password
   Authorization: Bearer {access-token}
   { "newPassword": "newSecurePass789" }

2. Controller (changePasswordSupabase.ts)
   ↓
   a) Verify current user (via token)
   ↓
   b) Update password in Supabase
      await supabaseAdmin.auth.updateUser({
        password: newPassword
      });

3. Password updated, session remains active
```

**Note**: No current password verification (Supabase handles session validation)

---

## User Deletion Flow

```
1. Client sends delete account request
   DELETE /api/v1/user
   { "currentPassword": "userPassword123" }

2. Controller (deleteUserSupabase.ts)
   ↓
   a) Verify password by attempting signin
      const { error } = await supabaseAuth.signInWithPassword({
        email, password
      });
   ↓
   b) Delete user data from PostgreSQL
      - CASCADE deletes: listings, vehicles, services, watchlist
      DELETE FROM "user" WHERE id = currentUserId;
   ↓
   c) Delete user from Supabase Auth
      await supabaseAdmin.auth.admin.deleteUser(currentUserId);
   ↓
   d) Clear cookies and return success

3. User account completely removed
```

**Cascade Operations**:
- All listings deleted (including photos from R2)
- All personal vehicles deleted
- All service records deleted
- All watchlist entries removed

---

## Multi-Client Token Handling

### Detecting Client Type
```typescript
const isFlutterClient = req.headers['x-client-type'] === 'flutter';
```

### Web Client Response
```typescript
// Set httpOnly cookies
res.cookie('sb-access-token', accessToken, cookieOptions);
res.cookie('sb-refresh-token', refreshToken, cookieOptions);

res.status(200).send({
  message: "Sign in successful",
  user: userData
});
```

### Flutter Client Response
```typescript
res.status(200).send({
  message: "Sign in successful",
  user: userData,
  accessToken: session.access_token,
  refreshToken: session.refresh_token
});
```

---

## Security Considerations

1. **Never expose service role key** - Only use on backend, never send to client
2. **Always verify JWT** - Don't trust client-provided user IDs
3. **Use httpOnly cookies for web** - Prevents XSS token theft
4. **CORS configuration** - Only allow trusted origins in `ALLOWED_COOKIE_ORIGINS`
5. **Supabase RLS** - Not used (PostgreSQL handles authorization via app logic)
6. **Password requirements** - Enforced by Supabase (configurable in dashboard)

---

## Common Issues & Solutions

### "Invalid token" errors
- Token expired → trigger refresh flow
- Token tampered → reject and require re-authentication
- Wrong Supabase project → check SUPABASE_URL env variable

### Email already exists (409)
- Check if user already registered
- Offer "Forgot password" flow
- Don't reveal if email exists (security)

### Cookie not sent with requests
- Check CORS `credentials: true`
- Verify `ALLOWED_COOKIE_ORIGINS` includes client origin
- Ensure client sends credentials (fetch with `credentials: 'include'`)

### Flutter tokens not working
- Verify `X-Client-Type: flutter` header sent
- Check Authorization header format: `Bearer {token}`
- Ensure client stores and sends refresh token
