# Transaction Patterns

## Overview

Motorix API uses **explicit PostgreSQL transactions** for multi-step operations to ensure data consistency. All transactions follow a consistent BEGIN/COMMIT/ROLLBACK pattern with manual connection management.

---

## Core Transaction Pattern

```typescript
async function operation(req: Request, res: Response): Promise<void> {
  const connection = await getPool().connect();

  try {
    await connection.query('BEGIN');

    await repository.operation1(data, connection);
    await repository.operation2(data, connection);

    await connection.query('COMMIT');
    connection.release();

    res.status(200).send({ message: 'Success' });

  } catch (error) {
    await connection.query('ROLLBACK');
    connection.release();
    throw error;
  }
}
```

**Key Points**:
- Acquire connection with `getPool().connect()` (not `getPool()`)
- Always release connection in both success and error paths
- Pass connection to all repository functions

---

## When to Use Transactions

### ✅ USE Transactions For:
- Multiple related writes (listing + photos, user + profile)
- Operations with external services (R2 upload + DB insert)
- Data integrity requirements (parent-child relationships)

### ❌ DON'T Use Transactions For:
- Single read operations (use `getPool()` directly)
- Single write operations with no dependencies
- Independent operations that don't need atomicity

---

## Pattern Examples

### Create with Relationships

```typescript
async function postListing(req: Request, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[];

  // Upload to R2 BEFORE transaction
  validateFiles(files);
  const uploadResult = await uploadImages(files);

  const connection = await getPool().connect();

  try {
    await connection.query('BEGIN');

    const result = await listingRepository.postListing(data, connection);
    await listingRepository.postListingPhotoPaths(
      result.rows[0].id,
      uploadResult.urls,
      connection
    );

    await connection.query('COMMIT');
    connection.release();

    res.status(201).send({ listingId: result.rows[0].id });

  } catch (error) {
    await connection.query('ROLLBACK');
    connection.release();

    // Rollback R2 uploads
    await deleteImages(uploadResult.keys);
    throw error;
  }
}
```

### Delete with External Service

```typescript
async function deleteUser(req: Request, res: Response): Promise<void> {
  const { currentUserId } = req.body;
  const connection = await getPool().connect();

  try {
    await connection.query('BEGIN');

    // Collect image keys before cascade
    const listings = await listingRepository.getUserListings(currentUserId, connection);
    const imageKeys = listings.flatMap(l => extractKeysFromUrls(l.imageUrls));

    // Database deletion (CASCADE handles relationships)
    await userRepository.deleteUser(currentUserId, connection);

    await connection.query('COMMIT');
    connection.release();

    // Delete from Supabase and R2 AFTER commit
    await supabaseAdmin.auth.admin.deleteUser(currentUserId);
    await deleteImages(imageKeys);

    res.status(200).send({ message: 'User deleted' });

  } catch (error) {
    await connection.query('ROLLBACK');
    connection.release();
    throw error;
  }
}
```

---

## Repository Connection Pattern

```typescript
async function postListing(
  data: Listing,
  connection?: Pool | PoolClient  // Optional for transaction support
): Promise<QueryResult> {
  const conn = connection || getPool();

  const query = convertQueryPlaceholders('INSERT INTO ...');
  return await conn.query(query, values);
}
```

**Usage**:
```typescript
// Without transaction
await listingRepository.postListing(data);

// With transaction
await listingRepository.postListing(data, connection);
```

---

## Common Pitfalls

| Mistake | Problem | Solution |
|---------|---------|----------|
| Forgetting `connection.release()` | Connection leak | Release in both try and catch |
| Not passing connection to repository | Operation outside transaction | Always pass connection param |
| Long operations inside transaction | Connection held too long | Move uploads before BEGIN |
| Multiple commits in one transaction | Transaction already closed | Single commit at the end |

---

## Checklist

- [ ] Connection acquired with `getPool().connect()`
- [ ] `BEGIN` executed
- [ ] Connection passed to all repository calls
- [ ] `COMMIT` on success
- [ ] `ROLLBACK` on error
- [ ] `connection.release()` in both paths
- [ ] External services rolled back if DB fails
