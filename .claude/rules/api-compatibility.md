# API Compatibility Rules

## Hard Rules

1. **NEVER change base URL**
   - Base URL: `/api/v1`
   - Hardcoded across web and mobile clients
   - Defined in `routes/base.routes.ts`

2. **NEVER break existing endpoints**
   - Maintain backward compatibility
   - Add new fields, don't rename existing ones
   - Deprecate before removing

3. **NEVER change response structure**
   ```typescript
   // Existing format - don't change
   {
     "message": "Success",
     "data": { ... }
   }

   // Error format - don't change
   {
     "message": "Error description"
   }
   ```

4. **ALWAYS support multi-client tokens**
   - Web clients: httpOnly cookies (`sb-access-token`, `sb-refresh-token`)
   - Flutter clients: Response body when `X-Client-Type: flutter` header present

## Adding New Endpoints

```typescript
// Follow existing patterns
app.route(rootUrl + '/new-resource')
  .get(optionalSupabaseAuth, validateRequestBody('schema'), asyncHandler(getResource))
  .post(supabaseAuthenticateReq, validateRequestBody('schema'), asyncHandler(postResource));
```

## Versioning Strategy

- Current version: `v1`
- Breaking changes require new version: `v2`
- Old versions maintained until clients migrate

## Client Detection

```typescript
const isFlutterClient = req.headers['x-client-type'] === 'flutter';

if (isFlutterClient) {
  // Return tokens in response body
  res.send({ accessToken, refreshToken, user });
} else {
  // Set httpOnly cookies
  res.cookie('sb-access-token', accessToken, cookieOptions);
  res.send({ user });
}
```

## Port

- Default: 4941
- Configurable via `PORT` env variable
- Don't hardcode in client apps
