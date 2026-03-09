# Validation Rules

## Hard Rules

1. **NEVER skip `additionalProperties: false` in AJV schemas**
   ```json
   {
     "schemaName": {
       "type": "object",
       "properties": { ... },
       "required": [...],
       "additionalProperties": false  // REQUIRED - prevents injection
     }
   }
   ```

2. **NEVER bypass AJV validation**
   - ALL endpoints accepting user input MUST have schema
   - Schema referenced by name in middleware: `validateRequestBody('schemaName')`

3. **NEVER skip currentUserId validation on protected routes**
   ```json
   {
     "properties": {
       "currentUserId": { "type": "string", "format": "uuid" }
     },
     "required": ["currentUserId"]
   }
   ```

4. **ALWAYS use two-tier validation**
   - **Schema (AJV)**: Structure, types, formats
   - **Business (Controller)**: Ownership, state, relationships

## Schema Location

All schemas in `src/app/resources/ajvSchema.json`

## Middleware Order

```typescript
app.route('/endpoint')
  .post(
    uploadMulter.array('images'),      // 1. File upload (if needed)
    supabaseAuthenticateReq,           // 2. Auth (injects currentUserId)
    validateRequestBody('schemaName'), // 3. Validation
    asyncHandler(controller)           // 4. Controller
  );
```

## Business Validation in Controllers

```typescript
// After AJV validation passes
const listing = await listingRepository.getListingById(id);

if (listing.length === 0) {
  throw new AppError(404, 'Listing not found');
}

if (listing[0].userIdFk !== currentUserId) {
  throw new AppError(403, 'Not authorized');
}
```
