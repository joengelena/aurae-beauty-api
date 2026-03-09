# Database Transaction Rules

## Hard Rules

1. **NEVER write raw SQL with string interpolation**
   ```typescript
   // WRONG - SQL injection risk
   const query = `SELECT * FROM "user" WHERE id = '${userId}'`;

   // CORRECT - parameterized query
   const query = convertQueryPlaceholders('SELECT * FROM "user" WHERE id = ?');
   await conn.query(query, [userId]);
   ```

2. **NEVER use pool directly for transactions**
   ```typescript
   // WRONG
   const pool = getPool();
   await pool.query('BEGIN');  // Won't work - different connections

   // CORRECT
   const connection = await getPool().connect();
   await connection.query('BEGIN');
   ```

3. **NEVER forget to release connections**
   ```typescript
   const connection = await getPool().connect();
   try {
     await connection.query('BEGIN');
     // operations
     await connection.query('COMMIT');
     connection.release();  // REQUIRED
   } catch (error) {
     await connection.query('ROLLBACK');
     connection.release();  // REQUIRED here too
     throw error;
   }
   ```

4. **NEVER skip transaction wrapper for multi-step operations**
   - Listing + photos = transaction
   - User creation + profile = transaction
   - Any operation with R2 + database = transaction with rollback

5. **ALWAYS pass connection to repository functions in transactions**
   ```typescript
   // WRONG - uses different connection
   await repository.operation(data);

   // CORRECT - uses transaction connection
   await repository.operation(data, connection);
   ```

## Transaction Template

```typescript
const connection = await getPool().connect();
try {
  await connection.query('BEGIN');
  await repo.operation1(data, connection);
  await repo.operation2(data, connection);
  await connection.query('COMMIT');
  connection.release();
} catch (error) {
  await connection.query('ROLLBACK');
  connection.release();
  throw error;
}
```
