# Database Schema Reference

**Database**: PostgreSQL  
**Schema source of truth**: `postgresql-db-tool/sql/shine/init/`  
**Reset & reseed**: `cd postgresql-db-tool && npm run reset && npm run seed`

---

## Architecture

One table (`user_dresses`) is the single source of truth for all dresses. The `is_public` flag controls visibility:

| `is_public` | Visible in |
|-------------|------------|
| `FALSE` | Owner's Wardrobe only |
| `TRUE` | Wardrobe + public Browse page |

The Browse page (`GET /dresses`) queries `user_dresses WHERE is_public = TRUE`, joining `user` for location. There is no separate "listing" concept — a dress is a listing when public.

---

## Active Tables

### `user_dresses`
Owner's dress inventory. Drives both the Wardrobe and the Browse page.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `user_id_fk` | CHAR(36) | FK → `user(id)`, CASCADE DELETE |
| `brand` | VARCHAR(100) | NOT NULL |
| `style` | VARCHAR(100) | NOT NULL |
| `size` | VARCHAR(10) | NOT NULL |
| `condition` | VARCHAR(50) | NOT NULL |
| `listing_type` | VARCHAR(10) | `'rent'` or `'sell'`, DEFAULT `'rent'` |
| `is_public` | BOOLEAN | DEFAULT FALSE — controls Browse visibility |
| `purchase_year` | INTEGER | NULL, CHECK 1900–2100 |
| `internal_name` | VARCHAR(100) | NULL — owner's private label |
| `color` | VARCHAR(255) | NULL |
| `rental_count` | INTEGER | DEFAULT 0 |
| `rental_price_per_day` | INTEGER | NULL — shown when `listing_type = 'rent'` |
| `purchase_price` | INTEGER | NULL — shown when `listing_type = 'sell'` |
| `dress_photo_url` | VARCHAR(500) | NULL — Cloudflare R2 URL |
| `damage_description` | TEXT | NULL |
| `damage_photo_urls` | TEXT[] | NULL — array of R2 URLs |
| `notes` | TEXT | NULL |
| `created_at` | TIMESTAMP | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | DEFAULT NOW() (trigger) |

**API routes**: `GET/POST /user/dresses`, `GET/PATCH/DELETE /user/dresses/:id` (auth required)  
**Public routes**: `GET /dresses`, `GET /dresses/:id` (no auth, `is_public = TRUE` only)

---

### `dress_bookings`
Rental bookings attached to a dress. Owner-managed.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `dress_id_fk` | INTEGER | FK → `user_dresses(id)`, CASCADE DELETE |
| `booking_type` | VARCHAR(50) | e.g. `'rental'`, `'personal_use'` |
| `start_date` | DATE | NOT NULL |
| `end_date` | DATE | NOT NULL |
| `renter_name` | VARCHAR(255) | |
| `renter_email` | VARCHAR(255) | |
| `renter_phone` | VARCHAR(50) | |
| `total_cost` | DECIMAL(10,2) | |
| `deposit_paid` | DECIMAL(10,2) | |
| `status` | VARCHAR(50) | `pending` → `confirmed` → `active` → `returned` |
| `notes` | TEXT | |
| `created_at` | TIMESTAMP | DEFAULT NOW() |
| `updated_at` | TIMESTAMP | DEFAULT NOW() (trigger) |

**API routes**: `GET /user/dresses/:id/bookings`, `POST /user/dress-bookings`, `DELETE /user/dress-bookings/:id`

---

### `user`
User profiles, synced from Supabase Auth on signup.

| Column | Type | Notes |
|--------|------|-------|
| `id` | CHAR(36) PK | Supabase Auth UUID |
| `first_name` | VARCHAR(50) | NOT NULL |
| `last_name` | VARCHAR(50) | NOT NULL |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `phone_number` | VARCHAR(12) | NOT NULL |
| `location` | VARCHAR(255) | NOT NULL — used as dress location in Browse |
| `profile_photo_url` | VARCHAR(500) | NULL — R2 URL |
| `instagram` | VARCHAR(100) | NULL |
| `is_email_verified` | SMALLINT | DEFAULT 0 |

**Notes**: Passwords are stored in Supabase Auth only, never here. CASCADE DELETE to `user_dresses` and `watchlist`.

---

### `dress_attribute`
Pre-computed filter attribute values for Browse dropdowns (e.g. available brands, sizes).

| Column | Type | Notes |
|--------|------|-------|
| `name` | VARCHAR(100) PK | Attribute key, e.g. `'brand'`, `'size'` |
| `attribute_values` | TEXT[] | Array of distinct values |

---

### `watchlist`
User's saved dresses.

| Column | Type | Notes |
|--------|------|-------|
| `user_id_fk` | CHAR(36) | FK → `user(id)` |
| `dress_id_fk` | INTEGER | FK → `user_dresses(id)` |
| `added_date` | TIMESTAMP | DEFAULT NOW() |

**Primary key**: `(user_id_fk, dress_id_fk)`

---

## Key Relationships

```
user (1) ───< (N) user_dresses
user (1) ───< (N) watchlist

user_dresses (1) ───< (N) dress_bookings
user_dresses (1) ───< (N) watchlist
```

---

## Conventions

- **UUIDs**: User IDs (Supabase Auth)
- **SERIAL**: Integer IDs for all other tables
- **BOOLEAN**: Used for `is_public` (PostgreSQL native)
- **SMALLINT**: Used for legacy boolean flags (0/1)
- **TIMESTAMP**: Always `DEFAULT NOW()`, UTC
- **TEXT[]**: PostgreSQL arrays for multi-value fields (damage photos, attribute values)
- **snake_case** in DB, mapped to **camelCase** in TypeScript/Dart
