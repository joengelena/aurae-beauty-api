# Supabase Integration Guide

## Overview

Motorix API uses **Supabase Auth** for authentication while maintaining a PostgreSQL database for application data. This hybrid approach provides:
- Secure authentication via Supabase (OAuth, email verification, password reset)
- Relational data queries via PostgreSQL (listings, vehicles, etc.)
- No password storage in application database

---

## Configuration

### Environment Variables

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here  # Admin privileges
SUPABASE_ANON_KEY=your_anon_key_here                   # Public/auth operations
```

**Where to find keys**:
1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Settings → API
4. Copy `URL`, `anon` key, and `service_role` key

---

## Dual Client Setup

### File: `config/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// Admin client - Backend operations (NEVER expose to client)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Auth client - Authentication operations
const supabaseAuth = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false  // Server-side, stateless
    }
  }
);

export { supabaseAdmin, supabaseAuth };
```

---

## Client Usage Patterns

### When to Use supabaseAdmin

✅ **User Creation (Signup)**
```typescript
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: user.email,
  password: user.password,
  email_confirm: false,  // Send verification email
  user_metadata: {
    first_name: user.firstName,
    last_name: user.lastName
  }
});
```

✅ **User Deletion**
```typescript
await supabaseAdmin.auth.admin.deleteUser(userId);
```

✅ **Token Verification**
```typescript
const { data, error } = await supabaseAdmin.auth.getUser(token);
if (!error) {
  const userId = data.user.id;
}
```

❌ **NEVER use for signin** - Security risk (bypasses rate limiting, auditing)

---

### When to Use supabaseAuth

✅ **User Signin**
```typescript
const { data, error } = await supabaseAuth.auth.signInWithPassword({
  email: credentials.email,
  password: credentials.password
});

if (!error) {
  const session = data.session;
  const accessToken = session.access_token;
  const refreshToken = session.refresh_token;
}
```

✅ **Token Refresh**
```typescript
const { data, error } = await supabaseAuth.auth.refreshSession({
  refresh_token: refreshToken
});
```

✅ **Password Reset Request**
```typescript
await supabaseAuth.auth.resetPasswordForEmail(email, {
  redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL
});
```

✅ **Signout**
```typescript
await supabaseAuth.auth.signOut();
```

---

## Supabase ↔ PostgreSQL Sync Strategy

### User Data Flow

```
Supabase Auth (Credentials)          PostgreSQL (Profile Data)
─────────────────────────            ─────────────────────────
id: UUID                     ←───→   id: UUID (FK reference)
email: user@example.com              email: user@example.com
password_hash: [hashed]              first_name: John
email_confirmed_at: timestamp        last_name: Doe
                                     phone_number: 0212345678
                                     location: Auckland
                                     profile_photo_url: R2 URL
```

### Signup Sync Pattern

```typescript
// 1. Create in Supabase Auth
const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
  email, password, email_confirm: false
});

if (authError) throw new AppError(400, authError.message);

// 2. Sync to PostgreSQL
try {
  await userRepository.signUpUser({
    id: authUser.user.id,  // Same UUID
    firstName, lastName, email, phoneNumber, location,
    isEmailVerified: 0,
    isPhoneNumberVerified: 0
  });
} catch (error) {
  // ROLLBACK: Delete from Supabase if PostgreSQL fails
  await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
  throw new AppError(500, 'Failed to create user');
}
```

### Why This Approach?

1. **Supabase for credentials** - Secure password hashing, email verification, OAuth
2. **PostgreSQL for relations** - Foreign keys to listings, vehicles, watchlist
3. **Single user ID** - Supabase UUID used across both systems
4. **No password duplication** - Never store passwords in PostgreSQL

---

## Email Verification

### Configuration

**Supabase Dashboard**:
1. Authentication → Email Templates
2. Confirm signup template:
   - Redirect URL: `{{ .ConfirmationURL }}`
   - Backend sets this via `EMAIL_VERIFICATION_REDIRECT_URL` env variable

**Environment Variable**:
```bash
EMAIL_VERIFICATION_REDIRECT_URL=http://localhost:4200/profile/email-verified
```

### Implementation

```typescript
// Signup automatically sends verification email
await supabaseAdmin.auth.admin.createUser({
  email: user.email,
  password: user.password,
  email_confirm: false  // false = send email, true = auto-confirm
});
```

### Development vs Production

**Development** (auto-confirm):
```typescript
email_confirm: true  // Skip email verification for testing
```

**Production** (require verification):
```typescript
email_confirm: false  // User must click email link
```

---

## Password Management

### Password Reset Flow

```typescript
// 1. User requests reset
await supabaseAuth.auth.resetPasswordForEmail(email, {
  redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL
});
// Supabase sends email with reset link

// 2. User clicks link, redirected to frontend with token in URL
// Frontend extracts token and sends to backend

// 3. Backend updates password
const { error } = await supabaseAdmin.auth.updateUser({
  password: newPassword
});
```

### Change Password (Authenticated)

```typescript
// User already authenticated (has valid session/token)
const { error } = await supabaseAdmin.auth.updateUser({
  password: newPassword
});
// No current password needed (session validates identity)
```

---

## Token Management

### Token Verification in Middleware

```typescript
// middlewares/supabaseAuthenticateReq.ts
async function supabaseAuthenticateReq(req: Request, res: Response, next: NextFunction) {
  // Extract token from cookies or Authorization header
  const token = req.cookies['sb-access-token'] ||
                req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).send({ message: 'Authentication required' });
  }

  // Verify with Supabase
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).send({ message: 'Invalid or expired token' });
  }

  // Inject user ID into request
  req.body.currentUserId = data.user.id;
  next();
}
```

### Token Refresh

```typescript
const { data, error } = await supabaseAuth.auth.refreshSession({
  refresh_token: refreshToken
});

if (!error) {
  const newAccessToken = data.session.access_token;
  const newRefreshToken = data.session.refresh_token;
}
```

---

## Error Handling

### Common Supabase Errors

```typescript
// Email already exists
{
  message: "User already registered",
  status: 409
}

// Invalid credentials
{
  message: "Invalid login credentials",
  status: 400
}

// Email not confirmed
{
  message: "Email not confirmed",
  status: 400
}

// Invalid token
{
  message: "Invalid token",
  status: 401
}
```

### Error Mapping Pattern

```typescript
try {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email, password
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new AppError(400, 'Invalid email or password');
    }
    if (error.message.includes('Email not confirmed')) {
      throw new AppError(400, 'Please verify your email before signing in');
    }
    throw new AppError(400, error.message);
  }
} catch (error) {
  // Handle and log
}
```

---

## Supabase Dashboard Configuration

### Authentication Settings

**Email Auth** (enabled):
- Confirm email: ON (production) / OFF (development)
- Double confirm email changed: ON
- Secure email change: ON

**Email Templates**:
- Customize "Confirm signup" template
- Set redirect URLs for password reset
- Add branding/styling

**Auth Providers** (optional future):
- Google OAuth
- GitHub OAuth
- Apple OAuth

### Security Settings

**JWT Expiry**:
- Access token: 3600 seconds (1 hour)
- Refresh token: 604800 seconds (7 days)

**Rate Limiting**:
- Email signup: 10 per hour per IP
- SMS signup: 5 per hour per IP

---

## Best Practices

### DO ✅

1. **Use supabaseAdmin for backend operations**
   - User creation, deletion, token verification

2. **Use supabaseAuth for user-initiated auth**
   - Signin, signup, password reset

3. **Sync user data to PostgreSQL**
   - Keep UUID consistent between systems
   - Rollback Supabase creation if PostgreSQL fails

4. **Verify tokens on every protected route**
   - Don't trust client-provided user IDs

5. **Use httpOnly cookies for web clients**
   - Prevents XSS attacks

### DON'T ❌

1. **Never expose SUPABASE_SERVICE_ROLE_KEY to client**
   - Grants full admin access

2. **Never store passwords in PostgreSQL**
   - Supabase handles all credential storage

3. **Never use supabaseAdmin for signin**
   - Use supabaseAuth (proper auditing, rate limiting)

4. **Never skip email verification in production**
   - Prevents fake accounts

5. **Never trust client-provided currentUserId**
   - Always extract from verified JWT

---

## Testing

### Local Testing

```bash
# Supabase local development (optional)
npx supabase init
npx supabase start
npx supabase db reset
```

### Manual Testing

```bash
# Test signup
curl -X POST http://localhost:4941/api/v1/user/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","firstName":"Test","lastName":"User","phoneNumber":"0211234567","location":"Auckland"}'

# Test signin
curl -X POST http://localhost:4941/api/v1/user/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## Migration Notes

### From Legacy Auth to Supabase

The codebase previously had a custom JWT auth system. Migration involved:

1. **Removed**:
   - Password hashing (bcrypt) in application code
   - Custom JWT generation/verification
   - CSRF token middleware
   - Auth token table in PostgreSQL

2. **Added**:
   - Supabase client configuration
   - Dual client pattern (admin/auth)
   - Multi-client token handling (web/Flutter)

3. **Kept**:
   - PostgreSQL for user profile data
   - User ID as UUID (compatible with Supabase)
   - Same user table structure (minus password field)

### Database Changes

```sql
-- BEFORE (custom auth)
CREATE TABLE "user" (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),  -- REMOVED
  ...
);

-- AFTER (Supabase auth)
CREATE TABLE "user" (
  id UUID PRIMARY KEY,  -- Matches Supabase Auth UUID
  email VARCHAR(255) UNIQUE,
  -- No password field
  ...
);
```

---

## Troubleshooting

### Issue: "Invalid token" errors

**Cause**: Token expired or tampered
**Solution**: Implement refresh flow on 401 responses

### Issue: Cookies not sent with requests

**Cause**: CORS misconfiguration
**Solution**:
- Check `ALLOWED_COOKIE_ORIGINS` includes client origin
- Verify `credentials: true` in CORS config
- Client must send `credentials: 'include'`

### Issue: Email verification link not working

**Cause**: Redirect URL mismatch
**Solution**:
- Check `EMAIL_VERIFICATION_REDIRECT_URL` env variable
- Verify Supabase email template uses `{{ .ConfirmationURL }}`

### Issue: Rate limit errors

**Cause**: Too many requests from same IP
**Solution**:
- Adjust rate limits in Supabase dashboard
- Implement client-side retry logic with exponential backoff
