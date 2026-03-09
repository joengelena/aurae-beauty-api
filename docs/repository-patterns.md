# Repository Patterns

## Overview

Repositories in Motorix API handle all database operations. They abstract SQL queries from controllers and handle data mapping between PostgreSQL (snake_case) and TypeScript (camelCase).

---

## Repository Structure

```
repositories/
├── userRepository/
│   ├── userRepository.ts        # CRUD operations
│   └── mapUserDbToObject.ts     # Data mapping
├── listingRepository/
│   ├── listingRepository.ts
│   ├── mapListingsDbToObject.ts
│   └── buildGetAllListingsQuery.ts  # Complex query builder
└── vehicleRepository/
    ├── vehicleRepository.ts
    └── mapVehicleDbToObject.ts
```

---

## Standard Repository Function

```typescript
import { Pool, PoolClient, QueryResult } from 'pg';
import { getPool } from '../../../config/db';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';
import { User } from '../../resources/types';
import mapUserDbToObject from './mapUserDbToObject';

async function getUserById(
  id: string,
  connection?: Pool | PoolClient  // Optional for transaction support
): Promise<User[]> {
  const conn = connection || getPool();

  const query = convertQueryPlaceholders(
    'SELECT * FROM "user" WHERE id = ?'
  );

  const result = await conn.query(query, [id]);
  return mapUserDbToObject(result.rows);
}

export { getUserById };
```

**Key Elements**:
1. Optional `connection` parameter for transactions
2. `convertQueryPlaceholders` for PostgreSQL compatibility
3. Data mapping function for response
4. Returns typed array

---

## Connection Parameter Pattern

### Why Optional Connection?

```typescript
// Without transaction - uses pool directly
const user = await userRepository.getUserById(userId);

// With transaction - uses transaction connection
const connection = await getPool().connect();
await connection.query('BEGIN');
const user = await userRepository.getUserById(userId, connection);
await connection.query('COMMIT');
connection.release();
```

### Implementation

```typescript
async function operation(
  data: any,
  connection?: Pool | PoolClient
): Promise<Result> {
  const conn = connection || getPool();
  // Use conn for queries
}
```

---

## Query Placeholder Conversion

### Why Needed?

Codebase migrated from MySQL (`?`) to PostgreSQL (`$1, $2`):

```typescript
// Write with MySQL-style placeholders
const query = 'SELECT * FROM "user" WHERE id = ? AND status = ?';

// Convert to PostgreSQL
const pgQuery = convertQueryPlaceholders(query);
// Result: 'SELECT * FROM "user" WHERE id = $1 AND status = $2'

await conn.query(pgQuery, [id, status]);
```

### Location: `utils/database/queryHelper.ts`

```typescript
export function convertQueryPlaceholders(query: string): string {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}
```

---

## Data Mapping

### Database → TypeScript

```typescript
// mapUserDbToObject.ts
function mapUserDbToObject(usersDb: any[]): User[] {
  return usersDb.map(user => ({
    id: user.id,
    firstName: user.first_name,      // snake_case → camelCase
    lastName: user.last_name,
    email: user.email,
    phoneNumber: user.phone_number,
    location: user.location,
    profilePhotoUrl: user.profile_photo_url,
    isEmailVerified: user.is_email_verified,
    isPhoneNumberVerified: user.is_phone_number_verified
  }));
}

export default mapUserDbToObject;
```

### Field Mapping Constant

```typescript
const userDbFields: Record<keyof User, string> = {
  id: 'id',
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  phoneNumber: 'phone_number',
  location: 'location',
  profilePhotoUrl: 'profile_photo_url',
  isEmailVerified: 'is_email_verified',
  isPhoneNumberVerified: 'is_phone_number_verified'
};
```

---

## CRUD Operations

### Create

```typescript
async function postListing(
  listing: Omit<Listing, 'id'>,
  connection?: Pool | PoolClient
): Promise<QueryResult> {
  const conn = connection || getPool();

  const query = convertQueryPlaceholders(`
    INSERT INTO "listing" (
      user_id_fk, make, model, year, price, description
    ) VALUES (?, ?, ?, ?, ?, ?)
    RETURNING id
  `);

  return await conn.query(query, [
    listing.userIdFk,
    listing.make,
    listing.model,
    listing.year,
    listing.price,
    listing.description
  ]);
}
```

### Read (Single)

```typescript
async function getListingById(
  id: string,
  connection?: Pool | PoolClient
): Promise<Listing[]> {
  const conn = connection || getPool();

  const query = convertQueryPlaceholders(
    'SELECT * FROM "listing" WHERE id = ?'
  );

  const result = await conn.query(query, [id]);
  return mapListingsDbToObject(result.rows);
}
```

### Read (Multiple with Filters)

```typescript
async function getAllListings(
  params: ListingQueryParams
): Promise<{ data: Listing[]; totalRows: number }> {
  const conn = getPool();

  const { query, values } = buildGetAllListingsQuery(params);
  const result = await conn.query(convertQueryPlaceholders(query), values);

  return {
    data: mapListingsDbToObject(result.rows),
    totalRows: result.rows[0]?.total_rows ?? 0
  };
}
```

### Update

```typescript
async function updateListing(
  id: number,
  updates: Partial<Listing>,
  connection?: Pool | PoolClient
): Promise<QueryResult> {
  const conn = connection || getPool();

  // Build dynamic SET clause
  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.make !== undefined) {
    setClauses.push('make = ?');
    values.push(updates.make);
  }
  if (updates.model !== undefined) {
    setClauses.push('model = ?');
    values.push(updates.model);
  }
  // ... more fields

  values.push(id);  // WHERE clause value

  const query = convertQueryPlaceholders(`
    UPDATE "listing"
    SET ${setClauses.join(', ')}
    WHERE id = ?
  `);

  return await conn.query(query, values);
}
```

### Delete

```typescript
async function deleteListing(
  id: number,
  connection?: Pool | PoolClient
): Promise<QueryResult> {
  const conn = connection || getPool();

  const query = convertQueryPlaceholders(
    'DELETE FROM "listing" WHERE id = ?'
  );

  return await conn.query(query, [id]);
}
```

---

## Complex Query Builder

### Location: `buildGetAllListingsQuery.ts`

```typescript
function buildGetAllListingsQuery(params: ListingQueryParams): {
  query: string;
  values: any[];
  limit: number;
} {
  const conditions: string[] = [];
  const values: any[] = [];

  // Search
  if (params.searchString) {
    conditions.push('(make ILIKE ? OR model ILIKE ? OR description ILIKE ?)');
    const search = `%${params.searchString}%`;
    values.push(search, search, search);
  }

  // Range filters
  if (params.priceFrom !== undefined) {
    conditions.push('original_price >= ?');
    values.push(params.priceFrom);
  }

  // Build WHERE clause
  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // Sorting
  const orderBy = getSortColumn(params.sortBy);

  // Pagination
  const limit = params.limit || 10;
  const offset = ((params.pageNumber || 1) - 1) * limit;

  const query = `
    SELECT *, COUNT(*) OVER() as total_rows
    FROM "listing"
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  values.push(limit, offset);

  return { query, values, limit };
}
```

---

## Creating a New Repository

### Step 1: Create Folder and Files

```
repositories/
└── newEntityRepository/
    ├── newEntityRepository.ts
    └── mapNewEntityDbToObject.ts
```

### Step 2: Define Mapping

```typescript
// mapNewEntityDbToObject.ts
import { NewEntity } from '../../resources/types';

function mapNewEntityDbToObject(rows: any[]): NewEntity[] {
  return rows.map(row => ({
    id: row.id,
    fieldName: row.field_name,
    createdAt: row.created_at
  }));
}

export default mapNewEntityDbToObject;
```

### Step 3: Implement Repository

```typescript
// newEntityRepository.ts
import { Pool, PoolClient, QueryResult } from 'pg';
import { getPool } from '../../../config/db';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';
import { NewEntity } from '../../resources/types';
import mapNewEntityDbToObject from './mapNewEntityDbToObject';

async function getById(
  id: string,
  connection?: Pool | PoolClient
): Promise<NewEntity[]> {
  const conn = connection || getPool();
  const query = convertQueryPlaceholders('SELECT * FROM "new_entity" WHERE id = ?');
  const result = await conn.query(query, [id]);
  return mapNewEntityDbToObject(result.rows);
}

async function create(
  data: Omit<NewEntity, 'id'>,
  connection?: Pool | PoolClient
): Promise<QueryResult> {
  const conn = connection || getPool();
  const query = convertQueryPlaceholders(`
    INSERT INTO "new_entity" (field_name)
    VALUES (?)
    RETURNING id
  `);
  return await conn.query(query, [data.fieldName]);
}

export { getById, create };
```

### Step 4: Add Type Definition

```typescript
// resources/types.ts
export interface NewEntity {
  id: number;
  fieldName: string;
  createdAt: Date;
}
```

---

## Best Practices

### DO ✅
- Use parameterized queries (never string interpolation)
- Convert placeholders with `convertQueryPlaceholders`
- Accept optional `connection` parameter
- Map database results to TypeScript types
- Use `RETURNING` clause for inserts
- Quote table names with reserved words (`"user"`)

### DON'T ❌
- Use string interpolation for values
- Hardcode connection acquisition
- Return raw database rows
- Mix snake_case and camelCase
- Skip the mapper function

---

## Checklist for New Repository

- [ ] Folder created under `repositories/`
- [ ] Main repository file with CRUD operations
- [ ] Mapper file for data transformation
- [ ] Optional connection parameter on all functions
- [ ] Query placeholders using `?` (converted automatically)
- [ ] Types defined in `resources/types.ts`
- [ ] Exported from repository index file
