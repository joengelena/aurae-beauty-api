# Code Style Rules

## Hard Rules

1. **NEVER use `var`**
   - Use `const` by default
   - Use `let` only when reassignment needed
   - Enforced by tslint

2. **NEVER create separate files for simple operations**
   - Controllers: One file per operation (Single Responsibility)
   - Structure: `controllers/domainController/operationName.ts`
   - Export via index file

3. **NEVER skip data mapping**
   - DB returns snake_case, API returns camelCase
   - Always use mapper functions: `mapUserDbToObject(result.rows)`

4. **NEVER commit without linting**
   ```bash
   npm run prebuild  # Runs tslint --fix
   ```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files/folders | camelCase | `userController/`, `signUpUser.ts` |
| Variables/functions | camelCase | `currentUserId`, `getUserById` |
| Types/interfaces | PascalCase | `User`, `UserDress`, `DressBooking` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| DB columns | snake_case | `user_id_fk`, `created_at` |

## File Organization

```typescript
// Import order
// 1. External dependencies
import { Request, Response } from 'express';
import { Pool } from 'pg';

// 2. Local utilities/types
import AppError from '../../utils/errors/appError';
import { User } from '../../resources/types';

// 3. Repositories
import * as userRepository from '../../repositories/userRepository';
```

## Controller Structure

```
controllers/
└── dressController/
    ├── index.ts           # Exports all operations
    ├── postDress.ts       # Single operation
    ├── getDressById.ts
    ├── patchDress.ts
    └── deleteDress.ts
```

Real controller folders: `cartController/`, `dressController/`,
`dressDamageIncidentController/`, `rentalBookingController/`,
`userController/`, `watchlistController/`.

## TypeScript

- `noImplicitAny: true` - All types must be explicit
- Types centralized in `resources/types.ts`
- Explicit return types: `Promise<void>`, `Promise<User[]>`
