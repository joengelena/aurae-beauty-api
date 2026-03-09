# Validation Schema Guide

## Overview

Motorix API uses **AJV (Another JSON Validator)** for request body validation. Schemas are defined in `ajvSchema.json` and applied via middleware.

---

## Two-Tier Validation

| Layer | Tool | Purpose | Example |
|-------|------|---------|---------|
| Schema | AJV Middleware | Structure, types, formats | Email format, required fields |
| Business | Controllers | Ownership, state, rules | User owns listing, status transitions |

---

## AJV Configuration

### Location: `middlewares/validateRequestBody.ts`

```typescript
const ajv = new Ajv({
  allErrors: true,           // Report all errors, not just first
  removeAdditional: 'all',   // Strip unknown properties
  coerceTypes: true,         // Convert strings to numbers/booleans
  useDefaults: true          // Apply default values
});
addFormats(ajv);             // Add format validators (email, uuid, date)
```

**Key Settings**:
- `removeAdditional: 'all'` - Prevents injection of extra fields
- `coerceTypes: true` - Handles form data (all strings)
- `allErrors: true` - Shows all validation failures

---

## Schema Location

### File: `resources/ajvSchema.json`

```json
{
  "postListing": {
    "type": "object",
    "properties": {
      "currentUserId": { "type": "string", "format": "uuid" },
      "make": { "type": "string", "minLength": 1, "maxLength": 255 },
      "year": { "type": "integer", "minimum": 1900, "maximum": 2100 }
    },
    "required": ["currentUserId", "make", "year"],
    "additionalProperties": false
  }
}
```

---

## Using Validation Middleware

### Route Setup

```typescript
import { validateRequestBody } from '../middlewares/validateRequestBody';

app.route('/listings')
  .post(
    uploadMulter.array('images', 10),
    supabaseAuthenticateReq,
    validateRequestBody('postListing'),  // Schema name from ajvSchema.json
    asyncHandler(postListing)
  );
```

### Middleware Order
1. File upload (if needed)
2. Authentication (injects currentUserId)
3. **Validation** (validates body including currentUserId)
4. Controller

---

## Common Schema Patterns

### String Fields

```json
{
  "email": { "type": "string", "format": "email" },
  "description": { "type": "string", "minLength": 1, "maxLength": 10000 },
  "status": { "type": "string", "enum": ["active", "sold", "expired"] }
}
```

### Number Fields

```json
{
  "year": { "type": "integer", "minimum": 1900, "maximum": 2100 },
  "price": { "type": "integer", "minimum": 0 },
  "kilometers": { "type": "integer", "minimum": 0 }
}
```

### Optional Fields

```json
{
  "color": { "type": "string", "maxLength": 50 },
  "seats": { "type": "integer", "minimum": 1, "maximum": 20 }
}
// Not in "required" array = optional
```

### Date Fields

```json
{
  "regoExpiryDate": { "type": "string", "format": "date" }
}
// Format: "YYYY-MM-DD"
```

### currentUserId (Always Required for Protected Routes)

```json
{
  "currentUserId": { "type": "string", "format": "uuid" }
}
// Injected by auth middleware, validated here
```

---

## Adding a New Schema

### Step 1: Add to ajvSchema.json

```json
{
  "existingSchema": { ... },

  "newEndpointSchema": {
    "type": "object",
    "properties": {
      "currentUserId": { "type": "string", "format": "uuid" },
      "fieldName": { "type": "string", "minLength": 1 }
    },
    "required": ["currentUserId", "fieldName"],
    "additionalProperties": false
  }
}
```

### Step 2: Apply in Route

```typescript
app.route('/new-endpoint')
  .post(
    supabaseAuthenticateReq,
    validateRequestBody('newEndpointSchema'),
    asyncHandler(newEndpointController)
  );
```

---

## Schema Examples

### Signup Schema

```json
{
  "signUp": {
    "type": "object",
    "properties": {
      "firstName": { "type": "string", "minLength": 1, "maxLength": 50 },
      "lastName": { "type": "string", "minLength": 1, "maxLength": 50 },
      "email": { "type": "string", "format": "email" },
      "password": { "type": "string", "minLength": 8 },
      "phoneNumber": { "type": "string", "minLength": 1, "maxLength": 12 },
      "location": { "type": "string", "minLength": 1, "maxLength": 255 }
    },
    "required": ["firstName", "lastName", "email", "password", "phoneNumber", "location"],
    "additionalProperties": false
  }
}
```

### Update Schema (Partial)

```json
{
  "updateUser": {
    "type": "object",
    "properties": {
      "currentUserId": { "type": "string", "format": "uuid" },
      "firstName": { "type": "string", "minLength": 1, "maxLength": 50 },
      "lastName": { "type": "string", "minLength": 1, "maxLength": 50 },
      "phoneNumber": { "type": "string", "maxLength": 12 },
      "location": { "type": "string", "maxLength": 255 }
    },
    "required": ["currentUserId"],
    "additionalProperties": false
  }
}
```

### Query Parameters Schema

```json
{
  "getListingsQuery": {
    "type": "object",
    "properties": {
      "searchString": { "type": "string" },
      "sortBy": {
        "type": "string",
        "enum": ["priceAsc", "priceDesc", "uploadDateDesc", "yearDesc"]
      },
      "limit": { "type": "integer", "minimum": 1, "maximum": 100 },
      "pageNumber": { "type": "integer", "minimum": 1 },
      "priceFrom": { "type": "integer", "minimum": 0 },
      "priceTo": { "type": "integer", "minimum": 0 }
    },
    "additionalProperties": false
  }
}
```

---

## Validation Error Format

When validation fails, response is:

```json
{
  "message": "body/email must match format \"email\""
}
```

Multiple errors (with `allErrors: true`):
```json
{
  "message": "body/email must match format \"email\", body/password must NOT have fewer than 8 characters"
}
```

---

## Business Validation in Controllers

After schema validation passes, controllers validate business rules:

```typescript
async function updateListing(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { currentUserId } = req.body;  // Validated as UUID by AJV

  // Business validation
  const listing = await listingRepository.getListingById(id);

  if (listing.length === 0) {
    throw new AppError(404, 'Listing not found');
  }

  if (listing[0].userIdFk !== currentUserId) {
    throw new AppError(403, 'You do not own this listing');
  }

  if (listing[0].status === 'sold') {
    throw new AppError(400, 'Cannot modify a sold listing');
  }

  // Proceed with update...
}
```

---

## Rules

### ALWAYS ✅
- Include `"additionalProperties": false` in every schema
- Validate `currentUserId` as UUID format on protected routes
- Use appropriate `minLength`/`maxLength` for strings
- Use `minimum`/`maximum` for numbers
- Add format validation (`email`, `uuid`, `date`)

### NEVER ❌
- Skip validation on any endpoint that accepts user input
- Allow `additionalProperties: true` (security risk)
- Trust client-provided `currentUserId` (auth middleware injects it)
- Put business logic in schemas (use controllers)

---

## Checklist for New Endpoints

- [ ] Schema added to `ajvSchema.json`
- [ ] `additionalProperties: false` included
- [ ] `currentUserId` validated (if protected route)
- [ ] All required fields in `required` array
- [ ] Appropriate type constraints added
- [ ] Middleware applied in route definition
- [ ] Business validation in controller
