# Error Response Rules

## Hard Rules

1. **NEVER return database errors to client**
   ```typescript
   // WRONG
   throw new AppError(500, error.message);  // Exposes DB details

   // CORRECT
   logger.error(`DB error: ${error.message}`);
   throw new AppError(500, 'Failed to save dress');
   ```

2. **NEVER log sensitive data**
   ```typescript
   // WRONG
   logger.error(`Login failed: ${email}, ${password}`);

   // CORRECT
   logger.error(`Login failed for user: ${email}`);
   ```

3. **ALWAYS use AppError class**
   ```typescript
   import AppError from '../../utils/errors/appError';
   throw new AppError(404, 'Dress not found');
   ```

4. **ALWAYS re-throw known AppErrors**
   ```typescript
   try {
     // operation
   } catch (error: any) {
     if (error instanceof AppError) throw error;  // Re-throw as-is
     logger.error(`Unexpected: ${error.message}`);
     throw new AppError(500, 'Operation failed');
   }
   ```

## Status Code Guide

| Code | When to Use |
|------|-------------|
| 200 | Successful GET, PATCH, DELETE |
| 201 | Resource created (POST) |
| 400 | Validation error, bad input |
| 401 | Missing/invalid authentication |
| 403 | Authenticated but not owner |
| 404 | Resource not found |
| 409 | Duplicate resource |
| 500 | Unexpected server error |

## Response Format

```json
{
  "message": "User-friendly error message"
}
```

## Logging

```typescript
// Log details for debugging
logger.error({
  message: error.message,
  userId: currentUserId,
  path: req.path,
  stack: error.stack
});

// Return generic message to client
throw new AppError(500, 'Operation failed. Please try again.');
```
