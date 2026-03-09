# API Endpoints Reference

**Base URL**: `/api/v1`
**Port**: 4941 (configurable via `PORT` env var)
**Content-Type**: `application/json`
**Authentication**: JWT tokens in httpOnly cookies or `Authorization` header

---

## Authentication Endpoints

### Sign Up
**POST** `/user/signup`

Creates new user in Supabase Auth and syncs to PostgreSQL.

**Request**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "phoneNumber": "0212345678",
  "location": "Auckland, NZ"
}
```

**Response** (201 Created):
```json
{
  "message": "User created successfully"
}
```

**Multi-client**:
- Web: Sets `sb-access-token` and `sb-refresh-token` httpOnly cookies
- Flutter: Include header `X-Client-Type: flutter` to receive tokens in response body

**Errors**:
- 400: Validation error (missing fields, invalid email)
- 409: Email already exists

---

### Sign In
**POST** `/user/signin`

Authenticates user via Supabase Auth.

**Request**:
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response** (200 OK):
```json
{
  "message": "Sign in successful",
  "user": {
    "id": "uuid",
    "email": "john.doe@example.com"
  }
}
```

**Multi-client**:
- Web: Sets httpOnly cookies
- Flutter: Returns `accessToken` and `refreshToken` in body if `X-Client-Type: flutter` header present

**Errors**:
- 400: Invalid credentials
- 401: Email not verified

---

### Sign Out
**POST** `/user/signout`
**Auth**: Required

Invalidates user session.

**Request**: Empty body (currentUserId injected by middleware)

**Response** (200 OK):
```json
{
  "message": "Sign out successful"
}
```

---

### Refresh Token
**POST** `/user/refresh-token`

Refreshes access token using refresh token.

**Request** (optional):
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response** (200 OK):
```json
{
  "message": "Token refreshed successfully"
}
```

**Notes**: Reads refresh token from cookies if not in body

---

### Forgot Password
**POST** `/user/forgot-password`

Sends password reset email via Supabase.

**Request**:
```json
{
  "email": "john.doe@example.com"
}
```

**Response** (200 OK):
```json
{
  "message": "Password reset email sent"
}
```

**Redirects**: User redirected to `PASSWORD_RESET_REDIRECT_URL` after clicking email link

---

### Reset Password
**POST** `/user/reset-password`
**Auth**: Requires valid reset token in URL (from email)

Resets password using token from email link.

**Request**:
```json
{
  "newPassword": "newSecurePassword456"
}
```

**Response** (200 OK):
```json
{
  "message": "Password reset successful"
}
```

---

### Change Password
**POST** `/user/change-password`
**Auth**: Required

Changes password for authenticated user.

**Request**:
```json
{
  "newPassword": "newSecurePassword789"
}
```

**Response** (200 OK):
```json
{
  "message": "Password changed successfully"
}
```

---

## User Management Endpoints

### View User Profile
**GET** `/users/:userId`
**Auth**: Optional (public endpoint)

Retrieves public user profile.

**Response** (200 OK):
```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "location": "Auckland, NZ",
  "profilePhotoUrl": "https://r2.url/path.jpg",
  "isEmailVerified": 1
}
```

**Notes**: Sensitive fields (email, phoneNumber) not returned

---

### Update User Profile
**PATCH** `/user`
**Auth**: Required

Updates authenticated user's profile.

**Request** (all fields optional except currentUserId):
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "0219876543",
  "location": "Wellington, NZ",
  "profilePhotoUrl": "https://r2.url/new-photo.jpg"
}
```

**Response** (200 OK):
```json
{
  "message": "User updated successfully"
}
```

---

### Delete User Account
**DELETE** `/user`
**Auth**: Required

Deletes user account from Supabase and PostgreSQL (cascades to all user data).

**Request**:
```json
{
  "currentPassword": "userPassword123"
}
```

**Response** (200 OK):
```json
{
  "message": "User deleted successfully"
}
```

**Cascade**: Deletes listings, vehicles, services, watchlist entries

---

## Watchlist Endpoints

### Get User Watchlist
**GET** `/user/watchlist`
**Auth**: Required

Retrieves user's saved listings.

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 123,
      "make": "Toyota",
      "model": "Corolla",
      "year": "2020",
      "originalPrice": 25000,
      "previewImgUrl": "https://r2.url/image.jpg",
      "isInWatchlist": 1
    }
  ]
}
```

---

### Add to Watchlist
**POST** `/user/watchlist-add/:listingId`
**Auth**: Required

Adds listing to user's watchlist.

**Response** (201 Created):
```json
{
  "message": "Listing added to watchlist"
}
```

**Errors**:
- 404: Listing not found
- 409: Already in watchlist

---

### Remove from Watchlist
**DELETE** `/user/watchlist-remove/:listingId`
**Auth**: Required

Removes listing from user's watchlist.

**Response** (200 OK):
```json
{
  "message": "Listing removed from watchlist"
}
```

---

## Listing Endpoints

### Get All Listings
**GET** `/listings`
**Auth**: Optional (includes watchlist status if authenticated)

Retrieves marketplace listings with filtering, sorting, and pagination.

**Query Parameters**:
```
searchString=toyota          # Search make/model/description
sortBy=priceAsc             # priceDesc|priceAsc|uploadDateDesc|uploadDateAsc|kilometersDesc|kilometersAsc|yearDesc|yearAsc
limit=20                    # Results per page (default 10)
pageNumber=1                # Page number (1-indexed)

# Range filters
priceFrom=10000
priceTo=50000
yearFrom=2015
yearTo=2023
kilometersFrom=0
kilometersTo=100000
seatsFrom=4
seatsTo=7
doorsFrom=2
doorsTo=5
engineSizeFrom=1000
engineSizeTo=3000

# Exact match filters
status=active               # active|sold|expired
location=Auckland
vehicleCondition=Excellent
make=Toyota
model=Corolla
fuelType=Petrol
bodyType=Sedan
driveType=FWD
transmission=Automatic
color=Black
cylinders=4
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 123,
      "make": "Toyota",
      "model": "Corolla",
      "year": "2020",
      "kilometers": 45000,
      "originalPrice": 25000,
      "discountedPrice": 23000,
      "previewImgUrl": "https://r2.url/preview.jpg",
      "imageUrls": ["url1", "url2", "url3"],
      "location": "Auckland",
      "vehicleCondition": "Excellent",
      "viewCount": 42,
      "status": "active",
      "isInWatchlist": 1
    }
  ],
  "pageNumber": 1,
  "totalPages": 5,
  "totalRows": 100
}
```

---

### Get Listing Attributes
**GET** `/listings/attributes`
**Auth**: None

Retrieves dynamic filter values for search dropdowns.

**Response** (200 OK):
```json
{
  "data": [
    {
      "name": "make",
      "attributeValues": ["Toyota", "Honda", "Mazda"]
    },
    {
      "name": "bodyType",
      "attributeValues": ["Sedan", "SUV", "Hatchback"]
    }
  ]
}
```

---

### Get Single Listing
**GET** `/listings/:id`
**Auth**: Optional

Retrieves detailed listing information.

**Response** (200 OK):
```json
{
  "id": 123,
  "userIdFk": "owner-uuid",
  "make": "Toyota",
  "model": "Corolla",
  "year": "2020",
  "kilometers": 45000,
  "originalPrice": 25000,
  "discountedPrice": 23000,
  "description": "Well maintained...",
  "imageUrls": ["url1", "url2"],
  "fuelType": "Petrol",
  "bodyType": "Sedan",
  "transmission": "Automatic",
  "color": "Black",
  "seats": 5,
  "doors": 4,
  "engineSize": 1800,
  "cylinders": 4,
  "numberPlate": "ABC123",
  "previousOwners": 1,
  "regoExpiryDate": "2025-06-15",
  "wofExpiryDate": "2025-06-15",
  "uploadDate": "2024-01-15T00:00:00Z",
  "viewCount": 42,
  "status": "active"
}
```

**Errors**:
- 404: Listing not found

---

### Create Listing
**POST** `/listings`
**Auth**: Required
**Content-Type**: `multipart/form-data`

Creates new marketplace listing with images.

**Form Data**:
```
images: File[] (1-10 files, max 10MB each, JPEG/PNG/WebP/HEIC)
make: string
model: string
year: integer
kilometers: integer
originalPrice: integer
location: string
vehicleCondition: string
description: string (max 10000 chars)
fuelType: string
bodyType: string
driveType: string
orcIncluded: integer (0 or 1)
numberPlate: string (optional)
seats: integer (optional)
doors: integer (optional)
previousOwners: integer (optional)
color: string (optional)
engineSize: integer (optional)
transmission: string (optional)
cylinders: integer (optional)
regoExpiryDate: string (YYYY-MM-DD) (optional)
wofExpiryDate: string (YYYY-MM-DD) (optional)
```

**Response** (201 Created):
```json
{
  "listingId": 123
}
```

**Errors**:
- 400: Validation error or file validation failed
- 413: File too large

---

### Update Listing
**PATCH** `/listings/:id`
**Auth**: Required (must be listing owner)
**Content-Type**: `multipart/form-data`

Updates existing listing. Supports partial updates and image replacement.

**Form Data** (all optional except currentUserId):
```
images: File[] (if provided, replaces ALL existing images)
photoPaths: object (existing image URLs to keep)
status: string (active|sold|expired)
... (same fields as POST /listings)
```

**Response** (200 OK):
```json
{
  "message": "Listing updated successfully"
}
```

**Errors**:
- 403: Not listing owner
- 404: Listing not found

**Image Update Logic**:
- If `images` provided: Delete old R2 images, upload new ones
- If `photoPaths` provided: Keep specified images
- Updates `listing_photo` table accordingly

---

### Delete Listing
**DELETE** `/listings/:id`
**Auth**: Required (must be listing owner)

Deletes listing and all associated images from R2.

**Response** (200 OK):
```json
{
  "message": "Listing deleted successfully"
}
```

**Errors**:
- 403: Not listing owner
- 404: Listing not found

**Cascade**: Deletes listing photos from DB and R2, removes from watchlists

---

### Increment View Count
**POST** `/listings/:id/view`
**Auth**: None

Increments listing view count (analytics).

**Response** (200 OK):
```json
{
  "message": "View count incremented"
}
```

---

## Personal Vehicle Endpoints

### Get User Vehicles
**GET** `/user/vehicles`
**Auth**: Required

Retrieves authenticated user's personal vehicles.

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "make": "Honda",
      "model": "Civic",
      "year": 2018,
      "nickname": "My Daily Driver",
      "licensePlate": "XYZ789",
      "color": "Blue",
      "odometerReading": 75000,
      "odometerUnit": "km",
      "regoExpiryDate": "2025-08-20",
      "wofExpiryDate": "2025-08-20",
      "insuranceExpiryDate": "2025-12-31",
      "insuranceProvider": "AA Insurance",
      "vehiclePhotoUrl": "https://r2.url/vehicle.jpg",
      "notes": "Regular maintenance up to date"
    }
  ]
}
```

---

### Create Personal Vehicle
**POST** `/user/vehicles`
**Auth**: Required
**Content-Type**: `multipart/form-data`

Adds vehicle to user's fleet.

**Form Data**:
```
image: File (optional, single file, max 10MB)
make: string
model: string
year: integer (1900-2100)
nickname: string (optional)
licensePlate: string (optional)
color: string (optional)
fuelType: string (optional)
transmission: string (optional)
odometerReading: integer (optional, 0-9,999,999)
odometerUnit: string ("km" or "mi", default "km")
regoExpiryDate: string (YYYY-MM-DD, required)
wofExpiryDate: string (YYYY-MM-DD, required)
insuranceExpiryDate: string (YYYY-MM-DD, required)
insuranceProvider: string (required)
notes: string (optional, max 10000 chars)
```

**Response** (201 Created):
```json
{
  "vehicleId": 1
}
```

---

### Get Vehicle by ID
**GET** `/user/vehicles/:id`
**Auth**: Required (must be vehicle owner)

Retrieves single vehicle details.

**Response** (200 OK):
```json
{
  "id": 1,
  "make": "Honda",
  "model": "Civic",
  ...
}
```

**Errors**:
- 403: Not vehicle owner
- 404: Vehicle not found

---

### Update Vehicle
**PATCH** `/user/vehicles/:id`
**Auth**: Required (must be vehicle owner)
**Content-Type**: `multipart/form-data`

Updates vehicle information.

**Form Data** (all optional except currentUserId):
```
image: File (replaces existing photo)
... (same fields as POST /user/vehicles)
```

**Response** (200 OK):
```json
{
  "message": "Vehicle updated successfully"
}
```

---

### Delete Vehicle
**DELETE** `/user/vehicles/:id`
**Auth**: Required (must be vehicle owner)

Deletes vehicle and all service records.

**Response** (200 OK):
```json
{
  "message": "Vehicle deleted successfully"
}
```

**Cascade**: Deletes all associated service records

---

## Vehicle Service Endpoints

### Get Vehicle Services
**GET** `/user/vehicles/:id/services`
**Auth**: Required (must be vehicle owner)

Retrieves maintenance history for a vehicle.

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "vehicleIdFk": 1,
      "typeOfService": "Oil Change",
      "serviceDate": "2024-06-15",
      "serviceProviderName": "Local Mechanic",
      "cost": 85.50,
      "notes": "Full synthetic oil used",
      "createdAt": "2024-06-15T10:30:00Z"
    }
  ]
}
```

---

### Create Service Record
**POST** `/user/vehicle-services`
**Auth**: Required

Adds service record to user's vehicle.

**Request**:
```json
{
  "vehicleIdFk": 1,
  "typeOfService": "Oil Change",
  "serviceDate": "2024-06-15",
  "serviceProviderName": "Local Mechanic",
  "cost": 85.50,
  "notes": "Full synthetic oil used"
}
```

**Response** (201 Created):
```json
{
  "serviceId": 1
}
```

**Errors**:
- 403: Not vehicle owner
- 404: Vehicle not found

---

### Delete Service Record
**DELETE** `/user/vehicle-services/:id`
**Auth**: Required (must be vehicle owner via service → vehicle relationship)

Deletes service record.

**Response** (200 OK):
```json
{
  "message": "Service record deleted successfully"
}
```

---

## Health Check

### Heartbeat
**GET** `/heartbeat`
**Auth**: None

Health check endpoint.

**Response** (200 OK):
```json
{
  "message": "I'm alive!"
}
```

---

## Common Response Codes

- **200 OK**: Successful request
- **201 Created**: Resource created successfully
- **400 Bad Request**: Validation error (check error message)
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Authenticated but not authorized (not owner)
- **404 Not Found**: Resource does not exist
- **409 Conflict**: Duplicate resource (email exists, already in watchlist)
- **413 Payload Too Large**: File size exceeds limit
- **500 Internal Server Error**: Server error (check logs)

## Error Response Format

```json
{
  "message": "Descriptive error message for the user"
}
```
