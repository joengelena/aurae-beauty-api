# Error Handling Guide

## Overview

Motorix API uses a centralized error handling pattern with custom `AppError` class and a global Express error handler.

---

## AppError Class

### Location: `utils/errors/appError.ts`

```typescript
class AppError extends Error {
  status: number;

  constructor(status = 400, message: string) {
    super(message);
    this.status = status;
    if (Error.captureStackTrace) Error.captureStackTrace(this, AppError);
  }
}
```

### Usage

```typescript
import AppError from '../../utils/errors/appError';

// Throw with status and message
throw new AppError(404, 'Listing not found');
throw new AppError(403, 'You do not own this listing');
throw new AppError(400, 'Invalid file type');
throw new AppError(500, 'Failed to upload images');
```

---

## HTTP Status Codes

| Code | Name | Usage |
|------|------|-------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Validation errors, invalid input |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Authenticated but not owner |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate (email exists, already in watchlist) |
| 413 | Payload Too Large | File size exceeds limit |
| 500 | Internal Server Error | Unexpected server error |

---

## Standard Error Pattern

### Controller Pattern

```typescript
async function getListingById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const listing = await listingRepository.getListingById(id);

    if (listing.length === 0) {
      throw new AppError(404, 'Listing not found');
    }

    res.status(200).send(listing[0]);

  } catch (error: any) {
    // Re-throw known AppErrors
    if (error instanceof AppError) throw error;

    // Log and wrap unknown errors
    logger.error(`Unexpected error getting listing: ${error.message}`);
    throw new AppError(500, 'Failed to retrieve listing');
  }
}
```

### Ownership Validation

```typescript
async function updateListing(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { currentUserId } = req.body;

  const listing = await listingRepository.getListingById(id);

  if (listing.length === 0) {
    throw new AppError(404, 'Listing not found');
  }

  if (listing[0].userIdFk !== currentUserId) {
    throw new AppError(403, 'You do not have permission to update this listing');
  }

  // Continue with update...
}
```

---

## Global Error Handler

### Location: `config/express.ts`

```typescript
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  logger.error({
    status,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(status).send({ message });
});
```

**Features**:
- Extracts status from AppError (defaults to 500)
- Logs error details (not exposed to client)
- Returns clean JSON response to client

---

## Async Handler Wrapper

### Location: `utils/asyncHandler.ts`

```typescript
export const asyncHandler = (fn: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
```

### Usage in Routes

```typescript
import { asyncHandler } from '../../utils/asyncHandler';
import { getListingById } from '../controllers/listingController';

app.route('/listings/:id')
  .get(asyncHandler(getListingById));  // Errors forwarded to global handler
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "message": "Human-readable error message"
}
```

**Examples**:
```json
{ "message": "Listing not found" }
{ "message": "Invalid email or password" }
{ "message": "Maximum 10 images allowed" }
{ "message": "You do not have permission to delete this vehicle" }
```

---

## Logging Rules

### DO Log ✅
- Error messages and stack traces
- User IDs involved in operations
- Request path and method
- Timestamps

### DON'T Log ❌
- Passwords (plain or hashed)
- JWT tokens
- Refresh tokens
- Full request bodies with sensitive data

### Example

```typescript
// Good
logger.error(`Failed to create listing for user ${currentUserId}: ${error.message}`);

// Bad - never log passwords
logger.error(`Login failed for ${email} with password ${password}`);
```

---

## External Service Errors

### Supabase Errors

```typescript
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
  logger.error(`Supabase auth error: ${error.message}`);
  throw new AppError(500, 'Authentication failed');
}
```

### Cloudflare R2 Errors

```typescript
try {
  await uploadImages(files);
} catch (error: any) {
  if (error.Code === 'NoSuchBucket') {
    logger.error('R2 bucket not configured');
    throw new AppError(500, 'Image storage not available');
  }
  logger.error(`R2 upload failed: ${error.message}`);
  throw new AppError(500, 'Failed to upload images');
}
```

### Database Errors

```typescript
try {
  await connection.query(query, values);
} catch (error: any) {
  if (error.code === '23505') {  // Unique violation
    throw new AppError(409, 'Email already registered');
  }
  if (error.code === '23503') {  // Foreign key violation
    throw new AppError(400, 'Referenced record does not exist');
  }
  logger.error(`Database error: ${error.message}`);
  throw new AppError(500, 'Database operation failed');
}
```

---

## Validation vs Business Errors

### Schema Validation (AJV - 400)
Handled by middleware, returns validation error messages:
```json
{ "message": "body/email must match format \"email\"" }
```

### Business Validation (Controllers - 400/403/404)
Handled in controllers after schema validation:
```typescript
// Ownership check
if (listing.userIdFk !== currentUserId) {
  throw new AppError(403, 'Not authorized');
}

// State validation
if (listing.status === 'sold') {
  throw new AppError(400, 'Cannot modify sold listing');
}
```

---

## Error Handling Checklist

- [ ] Use `AppError` for all thrown errors
- [ ] Include appropriate HTTP status code
- [ ] Write user-friendly error messages
- [ ] Re-throw `AppError` instances (don't wrap them)
- [ ] Wrap unknown errors with generic message
- [ ] Log detailed error for debugging
- [ ] Never expose internal/database errors to client
- [ ] Wrap async controllers with `asyncHandler`
