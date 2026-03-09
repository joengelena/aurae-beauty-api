# Testing Strategy

## Current State

The Motorix API codebase **does not currently have automated tests**. This document outlines a recommended testing strategy for future implementation.

---

## Recommended Test Structure

```
tests/
├── unit/
│   ├── utils/
│   │   ├── convertQueryPlaceholders.test.ts
│   │   ├── generateObjectKey.test.ts
│   │   └── buildPublicUrl.test.ts
│   ├── repositories/
│   │   └── mappers/
│   │       ├── mapUserDbToObject.test.ts
│   │       └── mapListingDbToObject.test.ts
│   └── middlewares/
│       └── validateRequestBody.test.ts
├── integration/
│   ├── auth/
│   │   ├── signup.test.ts
│   │   ├── signin.test.ts
│   │   └── signout.test.ts
│   ├── listings/
│   │   ├── createListing.test.ts
│   │   ├── getListing.test.ts
│   │   ├── updateListing.test.ts
│   │   └── deleteListing.test.ts
│   └── vehicles/
│       └── vehicleCrud.test.ts
└── setup/
    ├── testDb.ts
    ├── mockSupabase.ts
    └── mockR2.ts
```

---

## Recommended Tools

| Tool | Purpose |
|------|---------|
| Jest | Test runner and assertions |
| Supertest | HTTP request testing |
| ts-jest | TypeScript support |
| jest-mock-extended | Type-safe mocks |

### Installation

```bash
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest jest-mock-extended
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/**/*.d.ts'
  ]
};
```

---

## Unit Tests

### Testing Utilities

```typescript
// tests/unit/utils/convertQueryPlaceholders.test.ts
import { convertQueryPlaceholders } from '../../../src/app/utils/database/queryHelper';

describe('convertQueryPlaceholders', () => {
  it('converts single placeholder', () => {
    const result = convertQueryPlaceholders('SELECT * FROM users WHERE id = ?');
    expect(result).toBe('SELECT * FROM users WHERE id = $1');
  });

  it('converts multiple placeholders', () => {
    const result = convertQueryPlaceholders('INSERT INTO users (a, b) VALUES (?, ?)');
    expect(result).toBe('INSERT INTO users (a, b) VALUES ($1, $2)');
  });

  it('handles queries without placeholders', () => {
    const result = convertQueryPlaceholders('SELECT * FROM users');
    expect(result).toBe('SELECT * FROM users');
  });
});
```

### Testing Mappers

```typescript
// tests/unit/repositories/mappers/mapUserDbToObject.test.ts
import mapUserDbToObject from '../../../../src/app/repositories/userRepository/mapUserDbToObject';

describe('mapUserDbToObject', () => {
  it('maps snake_case to camelCase', () => {
    const dbRows = [{
      id: 'uuid-123',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone_number: '0211234567',
      location: 'Auckland',
      profile_photo_url: 'https://example.com/photo.jpg',
      is_email_verified: 1,
      is_phone_number_verified: 0
    }];

    const result = mapUserDbToObject(dbRows);

    expect(result).toEqual([{
      id: 'uuid-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phoneNumber: '0211234567',
      location: 'Auckland',
      profilePhotoUrl: 'https://example.com/photo.jpg',
      isEmailVerified: 1,
      isPhoneNumberVerified: 0
    }]);
  });

  it('handles empty array', () => {
    expect(mapUserDbToObject([])).toEqual([]);
  });
});
```

---

## Integration Tests

### Test Setup

```typescript
// tests/setup/testDb.ts
import { Pool } from 'pg';

let testPool: Pool;

export async function setupTestDb() {
  testPool = new Pool({
    host: process.env.TEST_POSTGRES_HOST || 'localhost',
    database: process.env.TEST_POSTGRES_DATABASE || 'motorix_test',
    user: process.env.TEST_POSTGRES_USER || 'postgres',
    password: process.env.TEST_POSTGRES_PASSWORD || 'postgres',
    port: 5432
  });

  // Run migrations or seed data
  await testPool.query('TRUNCATE "user" CASCADE');
  await testPool.query('TRUNCATE "listing" CASCADE');
}

export async function teardownTestDb() {
  await testPool.end();
}

export function getTestPool() {
  return testPool;
}
```

### Mocking Supabase

```typescript
// tests/setup/mockSupabase.ts
export const mockSupabaseAdmin = {
  auth: {
    admin: {
      createUser: jest.fn(),
      deleteUser: jest.fn()
    },
    getUser: jest.fn()
  }
};

export const mockSupabaseAuth = {
  auth: {
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    refreshSession: jest.fn()
  }
};

// Mock module
jest.mock('../../src/config/supabase', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabaseAuth: mockSupabaseAuth
}));
```

### Mocking Cloudflare R2

```typescript
// tests/setup/mockR2.ts
export const mockUploadImages = jest.fn().mockResolvedValue({
  urls: ['https://r2.example.com/image1.jpg'],
  keys: ['motorix/123-abc-image1.jpg']
});

export const mockDeleteImages = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/app/utils/cloudflare/uploadImages', () => ({
  default: mockUploadImages
}));

jest.mock('../../src/app/utils/cloudflare/deleteImages', () => ({
  default: mockDeleteImages
}));
```

---

## API Integration Tests

### Auth Tests

```typescript
// tests/integration/auth/signup.test.ts
import request from 'supertest';
import app from '../../../src/config/express';
import { mockSupabaseAdmin } from '../../setup/mockSupabase';
import { setupTestDb, teardownTestDb } from '../../setup/testDb';

describe('POST /api/v1/user/signup', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new user successfully', async () => {
    mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'uuid-123' } },
      error: null
    });

    const response = await request(app)
      .post('/api/v1/user/signup')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'securePassword123',
        phoneNumber: '0211234567',
        location: 'Auckland'
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User created successfully');
    expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalled();
  });

  it('returns 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/v1/user/signup')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'securePassword123',
        phoneNumber: '0211234567',
        location: 'Auckland'
      });

    expect(response.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' }
    });

    const response = await request(app)
      .post('/api/v1/user/signup')
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: 'securePassword123',
        phoneNumber: '0211234567',
        location: 'Auckland'
      });

    expect(response.status).toBe(409);
  });
});
```

### Listing Tests

```typescript
// tests/integration/listings/createListing.test.ts
import request from 'supertest';
import path from 'path';
import app from '../../../src/config/express';
import { mockSupabaseAdmin } from '../../setup/mockSupabase';
import { mockUploadImages } from '../../setup/mockR2';

describe('POST /api/v1/listings', () => {
  const validToken = 'valid-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock auth verification
    mockSupabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-uuid-123' } },
      error: null
    });
  });

  it('creates listing with images', async () => {
    const response = await request(app)
      .post('/api/v1/listings')
      .set('Cookie', `sb-access-token=${validToken}`)
      .field('make', 'Toyota')
      .field('model', 'Corolla')
      .field('year', '2020')
      .field('kilometers', '50000')
      .field('originalPrice', '25000')
      .field('location', 'Auckland')
      .field('vehicleCondition', 'Excellent')
      .field('description', 'Well maintained vehicle')
      .field('fuelType', 'Petrol')
      .field('bodyType', 'Sedan')
      .field('driveType', 'FWD')
      .field('orcIncluded', '1')
      .attach('images', path.join(__dirname, 'fixtures/test-image.jpg'));

    expect(response.status).toBe(201);
    expect(response.body.listingId).toBeDefined();
    expect(mockUploadImages).toHaveBeenCalled();
  });

  it('returns 401 without authentication', async () => {
    const response = await request(app)
      .post('/api/v1/listings')
      .field('make', 'Toyota');

    expect(response.status).toBe(401);
  });
});
```

---

## Running Tests

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration"
  }
}
```

### Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/utils/convertQueryPlaceholders.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="signup"

# Watch mode
npm run test:watch
```

---

## Test Environment

### Environment Variables

```bash
# .env.test
NODE_ENV=test
PORT=4942

# Test database (separate from dev/prod)
TEST_POSTGRES_HOST=localhost
TEST_POSTGRES_DATABASE=motorix_test
TEST_POSTGRES_USER=postgres
TEST_POSTGRES_PASSWORD=postgres
TEST_POSTGRES_PORT=5432
```

### Database Setup

```sql
-- Create test database
CREATE DATABASE motorix_test;

-- Apply same schema as production
-- (Run schema creation scripts)
```

---

## Coverage Goals

| Category | Target |
|----------|--------|
| Utilities | 90%+ |
| Mappers | 100% |
| Middleware | 80%+ |
| Controllers | 70%+ |
| Repositories | 60%+ |

**Priority Order**:
1. Critical utilities (query conversion, validation)
2. Data mappers (prevent regression)
3. Auth endpoints (security critical)
4. CRUD operations (core functionality)

---

## Manual Testing

Until automated tests are implemented, use these manual testing approaches:

### cURL Commands

```bash
# Signup
curl -X POST http://localhost:4941/api/v1/user/signup \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"password123","phoneNumber":"0211234567","location":"Auckland"}'

# Signin
curl -X POST http://localhost:4941/api/v1/user/signin \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'

# Get listings (with auth cookie)
curl http://localhost:4941/api/v1/listings \
  -b cookies.txt
```

### Postman Collection

Create a Postman collection with:
- Environment variables for tokens
- Pre-request scripts for auth
- Test scripts for assertions
- Collection runner for full flow tests

---

## Implementation Roadmap

### Phase 1: Foundation
- [ ] Set up Jest configuration
- [ ] Create test utilities and mocks
- [ ] Write unit tests for utilities

### Phase 2: Core Testing
- [ ] Write mapper tests
- [ ] Write middleware tests
- [ ] Write auth integration tests

### Phase 3: API Coverage
- [ ] Write listing CRUD tests
- [ ] Write vehicle CRUD tests
- [ ] Write watchlist tests

### Phase 4: CI/CD Integration
- [ ] Add test step to build pipeline
- [ ] Configure coverage reporting
- [ ] Set up test database in CI
