# Database Schema Reference

**Database**: PostgreSQL
**Schema Management**: Managed outside codebase (no migration files in repo)

## Core Tables

### `user`
Stores user profile data synced from Supabase Auth.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Supabase Auth user ID |
| `first_name` | VARCHAR(50) | NOT NULL | User's first name |
| `last_name` | VARCHAR(50) | NOT NULL | User's last name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email address (managed by Supabase) |
| `phone_number` | VARCHAR(12) | NOT NULL | Phone number |
| `location` | VARCHAR(255) | NOT NULL | User location/city |
| `profile_photo_url` | VARCHAR(500) | NULL | Cloudflare R2 URL |
| `is_email_verified` | SMALLINT | DEFAULT 0 | 0 or 1 (boolean) |
| `is_phone_number_verified` | SMALLINT | DEFAULT 0 | 0 or 1 (boolean) |

**Notes**:
- Passwords stored in Supabase Auth, NOT in this table
- `id` matches Supabase Auth UUID
- DELETE CASCADE to `listing`, `user_vehicles`, `watchlist`

---

### `listing`
Marketplace vehicle listings for sale.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Auto-increment listing ID |
| `user_id_fk` | UUID | FOREIGN KEY → user(id) | Listing owner |
| `status` | VARCHAR(20) | NOT NULL, CHECK | 'active', 'sold', 'expired' |
| `view_count` | INTEGER | DEFAULT 0 | Number of views |
| `preview_img_url` | VARCHAR(500) | NOT NULL | First image (R2 URL) |
| `location` | VARCHAR(255) | NOT NULL | Vehicle location |
| `vehicle_condition` | VARCHAR(255) | NOT NULL | Condition (e.g., 'Excellent', 'Good') |
| `original_price` | BIGINT | NOT NULL | Price in cents/smallest unit |
| `discounted_price` | BIGINT | NULL | Sale price (optional) |
| `upload_date` | TIMESTAMP | DEFAULT NOW() | Created timestamp |
| `description` | TEXT(10000) | NOT NULL | Listing description |
| `make` | VARCHAR(255) | NOT NULL | Vehicle manufacturer |
| `model` | VARCHAR(255) | NOT NULL | Vehicle model |
| `year` | INTEGER | NOT NULL | Manufacturing year |
| `kilometers` | BIGINT | NOT NULL | Odometer reading |
| `fuel_type` | VARCHAR(255) | NOT NULL | Fuel type |
| `body_type` | VARCHAR(255) | NOT NULL | Body style |
| `drive_type` | VARCHAR(255) | NOT NULL | Drivetrain (FWD/RWD/AWD) |
| `orc_included` | SMALLINT | NOT NULL | 0 or 1 |
| `number_plate` | VARCHAR(255) | NULL | License plate |
| `seats` | INTEGER | NULL | Number of seats |
| `doors` | INTEGER | NULL | Number of doors |
| `previous_owners` | INTEGER | NULL | Ownership history |
| `color` | VARCHAR(50) | NULL | Exterior color |
| `engine_size` | INTEGER | NULL | Engine displacement (cc) |
| `transmission` | VARCHAR(255) | NULL | Transmission type |
| `cylinders` | INTEGER | NULL | Number of cylinders |
| `rego_expiry_date` | DATE | NULL | Registration expiry |
| `wof_expiry_date` | DATE | NULL | WOF expiry (NZ specific) |

**Indexes**:
- `user_id_fk` (foreign key index)
- `status` (for active listings queries)
- `upload_date` (for sorting)
- `make`, `model` (for filtering)

**CASCADE**: ON DELETE CASCADE when user deleted

---

### `listing_photo`
Stores multiple photos per listing in order.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `listing_id_fk` | INTEGER | FOREIGN KEY → listing(id) | Parent listing |
| `photo_order` | INTEGER | NOT NULL | Display order (0-indexed) |
| `photo_path` | VARCHAR(500) | NOT NULL | Cloudflare R2 URL |

**Primary Key**: `(listing_id_fk, photo_order)`
**CASCADE**: ON DELETE CASCADE when listing deleted

---

### `listing_attribute`
Stores dynamic filter values for marketplace search.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `name` | VARCHAR(100) | PRIMARY KEY | Attribute name (e.g., 'make', 'bodyType') |
| `attribute_values` | TEXT[] | NOT NULL | Array of distinct values |

**Usage**: Pre-computed filter options for frontend dropdowns

---

### `watchlist`
User's saved/favorite listings (join table).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id_fk` | UUID | FOREIGN KEY → user(id) | User who saved |
| `listing_id_fk` | INTEGER | FOREIGN KEY → listing(id) | Saved listing |
| `added_date` | TIMESTAMP | DEFAULT NOW() | When saved |

**Primary Key**: `(user_id_fk, listing_id_fk)`
**CASCADE**: ON DELETE CASCADE for both foreign keys

---

## Personal Vehicle Management

### `user_vehicles`
User's personal vehicles (not for sale).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Vehicle ID |
| `user_id_fk` | UUID | FOREIGN KEY → user(id) | Vehicle owner |
| `make` | VARCHAR(100) | NOT NULL | Manufacturer |
| `model` | VARCHAR(100) | NOT NULL | Model name |
| `year` | INTEGER | NOT NULL | Year (1900-2100) |
| `nickname` | VARCHAR(100) | NULL | Custom vehicle name |
| `license_plate` | VARCHAR(20) | NULL | License plate number |
| `color` | VARCHAR(255) | NULL | Exterior color |
| `fuel_type` | VARCHAR(255) | NULL | Fuel type |
| `transmission` | VARCHAR(255) | NULL | Transmission type |
| `odometer_reading` | INTEGER | NULL | Current odometer (0-9,999,999) |
| `odometer_unit` | VARCHAR(10) | DEFAULT 'km' | 'km' or 'mi' |
| `rego_expiry_date` | DATE | NOT NULL | Registration expiry |
| `wof_expiry_date` | DATE | NOT NULL | WOF expiry |
| `insurance_expiry_date` | DATE | NOT NULL | Insurance expiry |
| `insurance_provider` | VARCHAR(255) | NOT NULL | Insurance company |
| `vehicle_photo_url` | VARCHAR(500) | NULL | Cloudflare R2 URL |
| `notes` | TEXT(10000) | NULL | User notes |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Created timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modified |

**CASCADE**: ON DELETE CASCADE when user deleted

---

### `vehicle_service`
Service/maintenance records for user vehicles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Service record ID |
| `vehicle_id_fk` | INTEGER | FOREIGN KEY → user_vehicles(id) | Parent vehicle |
| `type_of_service` | VARCHAR(150) | NOT NULL | Service type (e.g., 'Oil Change') |
| `service_date` | DATE | NOT NULL | Date of service |
| `service_provider_name` | VARCHAR(150) | NULL | Service provider/mechanic |
| `cost` | DECIMAL(10,2) | NULL | Service cost |
| `notes` | TEXT(10000) | NULL | Service notes |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Created timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modified |

**CASCADE**: ON DELETE CASCADE when vehicle deleted

---

## Future Tables (Defined but Not Yet Implemented)

### `service_history`
Extended service tracking (alternative to `vehicle_service`).

### `service_reminder`
Scheduled maintenance reminders for vehicles.

### `notification_preferences`
User notification settings for reminders.

### `device_token`
Push notification device tokens.

### `notification_log`
History of sent notifications.

---

## Key Relationships

```
user (1) ───< (N) listing
user (1) ───< (N) user_vehicles
user (1) ───< (N) watchlist

listing (1) ───< (N) listing_photo
listing (1) ───< (N) watchlist

user_vehicles (1) ───< (N) vehicle_service
```

## Data Type Conventions

- **UUIDs**: User IDs (synced from Supabase Auth)
- **SERIAL**: Auto-increment integer IDs
- **SMALLINT**: Boolean values (0 or 1) - prefer this over BOOLEAN for consistency
- **BIGINT**: Large numbers (prices, kilometers)
- **TIMESTAMP**: Always use `DEFAULT NOW()` for created_at/updated_at
- **TEXT[]**: PostgreSQL arrays for multi-value attributes
- **VARCHAR lengths**:
  - Names: 50-150
  - URLs: 500
  - Descriptions: Use TEXT with max length validation in code

## Important Notes

1. **No password fields** - All authentication credentials stored in Supabase Auth
2. **CASCADE deletions configured** - User deletion automatically cascades to all related data
3. **Boolean values** - Use SMALLINT (0/1) not BOOLEAN for consistency with TypeScript mapping
4. **Timestamps** - All timestamps in UTC, timezone conversion handled in application layer
5. **Column naming** - snake_case in database, mapped to camelCase in TypeScript
