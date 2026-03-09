# Cloudflare R2 Integration Guide

## Overview

Motorix API uses **Cloudflare R2** for image storage. R2 is an S3-compatible object storage service with zero egress fees, making it cost-effective for serving images.

**Why R2?**
- S3-compatible API (easy integration with AWS SDK)
- Zero egress fees (unlimited image serving)
- Global CDN distribution
- Cost-effective storage

---

## Configuration

### Environment Variables

```bash
# .env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=motorix-images

# Optional: Custom domain (if configured in Cloudflare)
R2_PUBLIC_DOMAIN=
# Leave empty to use default R2.dev URL: https://{bucket}.{accountId}.r2.cloudflarestorage.com
```

### Getting Credentials

1. **Cloudflare Dashboard**: https://dash.cloudflare.com
2. **R2** → **Overview** → **Manage R2 API Tokens**
3. **Create API Token**:
   - Permissions: Object Read & Write
   - Bucket: motorix-images (or your bucket name)
4. Copy Account ID, Access Key ID, Secret Access Key

---

## R2 Client Setup

### File: `utils/cloudflare/r2Client.ts`

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',  // R2 uses 'auto' region
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
  }
});

export default r2Client;
```

**Key Differences from AWS S3**:
- Region is always `'auto'`
- Endpoint format: `https://{accountId}.r2.cloudflarestorage.com`
- Bucket access is regional (no cross-region replication needed)

---

## Image Upload Flow

### Complete Upload Pattern

```typescript
// 1. Multer captures file in memory
uploadMulter.array('images', 10)

// 2. Validate files
validateFiles(files);
// - Check file count (max 10)
// - Check file sizes (max 10MB each)
// - Check MIME types (JPEG, PNG, WebP, HEIC)

// 3. Upload to R2
const uploadResult = await uploadImages(files);
// Returns: { urls: string[], keys: string[] }

// 4. Store URLs in database
await listingRepository.postListingPhotoPaths(listingId, uploadResult.urls, connection);

// 5. If DB fails, rollback R2 uploads
catch (error) {
  await deleteImages(uploadResult.keys);
  throw error;
}
```

---

## Upload Implementation

### File: `utils/cloudflare/uploadImages.ts`

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import r2Client from './r2Client';
import generateObjectKey from './generateObjectKey';
import buildPublicUrl from './buildPublicUrl';

async function uploadImages(files: Express.Multer.File[]): Promise<{
  urls: string[];
  keys: string[];
}> {
  const uploadPromises = files.map(async (file) => {
    const key = generateObjectKey(file.originalname);

    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000'  // 1 year cache
    }));

    return {
      url: buildPublicUrl(key),
      key: key
    };
  });

  const results = await Promise.all(uploadPromises);

  return {
    urls: results.map(r => r.url),
    keys: results.map(r => r.key)
  };
}

export default uploadImages;
```

---

## Key Generation Strategy

### File: `utils/cloudflare/generateObjectKey.ts`

```typescript
function generateObjectKey(originalFilename: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);

  // Sanitize filename: lowercase, replace spaces with hyphens
  const sanitized = originalFilename
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '');

  return `motorix/${timestamp}-${randomString}-${sanitized}`;
}
```

**Pattern**: `motorix/{timestamp}-{random}-{filename}`

**Example**: `motorix/1704067200000-a1b2c3d4e5f-toyota-corolla.jpg`

**Benefits**:
- Unique keys (timestamp + random)
- Organized under `motorix/` prefix
- Sortable by upload time
- Human-readable filenames

---

## Public URL Generation

### File: `utils/cloudflare/buildPublicUrl.ts`

```typescript
function buildPublicUrl(key: string): string {
  const customDomain = process.env.R2_PUBLIC_DOMAIN;

  if (customDomain) {
    // Custom domain: https://cdn.motorix.com/motorix/image.jpg
    return `https://${customDomain}/${key}`;
  }

  // Default R2.dev URL
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;
  return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
}
```

**Custom Domain Setup** (optional):
1. Cloudflare Dashboard → R2 → Bucket → Settings
2. Add custom domain (e.g., `cdn.motorix.com`)
3. Update DNS CNAME record
4. Set `R2_PUBLIC_DOMAIN=cdn.motorix.com` in `.env`

---

## File Validation

### File: `utils/cloudflare/validation.ts`

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10MB
const MAX_FILE_COUNT = 10;
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];

function validateFiles(files: Express.Multer.File[]): void {
  if (!files || files.length === 0) {
    throw new AppError(400, 'At least one image is required');
  }

  if (files.length > MAX_FILE_COUNT) {
    throw new AppError(400, `Maximum ${MAX_FILE_COUNT} images allowed`);
  }

  files.forEach((file, index) => {
    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(400, `Image ${index + 1} exceeds 10MB limit`);
    }

    // Type validation
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new AppError(400, `Image ${index + 1} has invalid type. Only JPEG, PNG, WebP, and HEIC allowed`);
    }
  });
}
```

**Validation Rules**:
- **Count**: 1-10 images per upload
- **Size**: Max 10MB per file
- **Types**: JPEG, PNG, WebP, HEIC/HEIF only
- **Throws**: AppError with 400 status if validation fails

---

## Image Deletion

### File: `utils/cloudflare/deleteImages.ts`

```typescript
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import r2Client from './r2Client';

async function deleteImages(keys: string[]): Promise<void> {
  if (!keys || keys.length === 0) return;

  await r2Client.send(new DeleteObjectsCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Delete: {
      Objects: keys.map(key => ({ Key: key })),
      Quiet: true
    }
  }));
}

export default deleteImages;
```

**Usage**:
- Rollback after failed DB operation
- Delete listing images when listing deleted
- Delete vehicle photo when vehicle deleted

---

## Rollback Pattern

### Transaction with R2 Rollback

```typescript
async function postListing(req: Request, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[];

  // Validate before uploading
  validateFiles(files);

  // Upload to R2
  const uploadResult = await uploadImages(files);

  const connection = await getPool().connect();

  try {
    await connection.query('BEGIN');

    // Database operations
    const result = await listingRepository.postListing(listingData, connection);
    await listingRepository.postListingPhotoPaths(
      result.rows[0].id,
      uploadResult.urls,
      connection
    );

    await connection.query('COMMIT');
    connection.release();

    res.status(201).send({ listingId: result.rows[0].id });

  } catch (error) {
    // ROLLBACK database
    await connection.query('ROLLBACK');
    connection.release();

    // ROLLBACK R2 uploads
    await deleteImages(uploadResult.keys);

    throw error;
  }
}
```

**Critical**: Always delete R2 objects if database operation fails to prevent orphaned files

---

## Update Image Pattern

### Replace Images on Update

```typescript
async function updateListing(req: Request, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[];
  const { photoPaths } = req.body;  // Existing URLs to keep

  let newImageKeys: string[] = [];
  let oldImageKeys: string[] = [];

  const connection = await getPool().connect();

  try {
    // Get existing images
    const existingListing = await listingRepository.getListingById(listingId, connection);
    oldImageKeys = extractKeysFromUrls(existingListing[0].imageUrls);

    // Upload new images if provided
    if (files && files.length > 0) {
      validateFiles(files);
      const uploadResult = await uploadImages(files);
      newImageKeys = uploadResult.keys;
    }

    await connection.query('BEGIN');

    // Update database with new image URLs
    await listingRepository.updateListingPhotos(listingId, newImageUrls, connection);

    // Delete old images from R2
    await deleteImages(oldImageKeys);

    await connection.query('COMMIT');
    connection.release();

  } catch (error) {
    await connection.query('ROLLBACK');
    connection.release();

    // Rollback: delete new uploads, keep old images
    if (newImageKeys.length > 0) {
      await deleteImages(newImageKeys);
    }

    throw error;
  }
}
```

---

## Bulk Operations

### Delete All Listing Images

```typescript
// When deleting a listing, delete all associated images
async function deleteListing(listingId: number): Promise<void> {
  const connection = await getPool().connect();

  try {
    await connection.query('BEGIN');

    // Get image URLs before deleting
    const listing = await listingRepository.getListingById(listingId, connection);
    const imageKeys = extractKeysFromUrls(listing[0].imageUrls);

    // Delete from database
    await listingRepository.deleteListing(listingId, connection);

    // Delete from R2
    await deleteImages(imageKeys);

    await connection.query('COMMIT');
    connection.release();

  } catch (error) {
    await connection.query('ROLLBACK');
    connection.release();
    throw error;
  }
}
```

---

## Helper Functions

### Extract R2 Keys from URLs

```typescript
function extractKeysFromUrls(urls: string[]): string[] {
  return urls.map(url => {
    // Extract key from URL
    // https://bucket.account.r2.cloudflarestorage.com/motorix/image.jpg → motorix/image.jpg
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1);  // Remove leading slash
  });
}
```

### Single Image Upload (for vehicle photos)

```typescript
async function uploadSingleImage(file: Express.Multer.File): Promise<string> {
  validateFiles([file]);  // Reuse validation

  const result = await uploadImages([file]);
  return result.urls[0];
}
```

---

## R2 Bucket Configuration

### Public Access Settings

**Cloudflare Dashboard → R2 → Bucket → Settings**:

1. **Public Access**: ON
   - Allows public read access to objects
   - Required for serving images to clients

2. **Custom Domain** (optional):
   - Add CNAME record in DNS
   - Enable custom domain in bucket settings

3. **CORS Configuration** (if accessing from browser):
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Performance Optimization

### Cache Headers

```typescript
await r2Client.send(new PutObjectCommand({
  Bucket: bucketName,
  Key: key,
  Body: buffer,
  ContentType: mimetype,
  CacheControl: 'public, max-age=31536000',  // 1 year
  ContentDisposition: 'inline'  // Display in browser, not download
}));
```

### Image Optimization (Future)

Consider adding:
- Image compression before upload (sharp library)
- Multiple sizes for responsive images (thumbnail, medium, full)
- WebP conversion for modern browsers
- Lazy loading on frontend

---

## Error Handling

### Common R2 Errors

```typescript
// Bucket not found
{
  Code: 'NoSuchBucket',
  message: 'The specified bucket does not exist'
}

// Access denied
{
  Code: 'AccessDenied',
  message: 'Access Denied'
}

// Invalid credentials
{
  Code: 'InvalidAccessKeyId',
  message: 'The AWS access key ID you provided does not exist'
}
```

### Error Handling Pattern

```typescript
try {
  await uploadImages(files);
} catch (error: any) {
  if (error.Code === 'NoSuchBucket') {
    logger.error('R2 bucket not found. Check R2_BUCKET_NAME env variable');
    throw new AppError(500, 'Image storage not configured');
  }

  if (error.Code === 'AccessDenied') {
    logger.error('R2 access denied. Check credentials and bucket permissions');
    throw new AppError(500, 'Image upload failed');
  }

  logger.error(`R2 upload error: ${error.message}`);
  throw new AppError(500, 'Failed to upload images');
}
```

---

## Best Practices

### DO ✅

1. **Validate before uploading**
   - Check file size, count, and type before R2 upload
   - Fail fast to avoid unnecessary uploads

2. **Use transactions with rollback**
   - Delete R2 objects if DB operation fails
   - Prevent orphaned files

3. **Generate unique keys**
   - Use timestamp + random string
   - Avoid key collisions

4. **Set appropriate cache headers**
   - Long cache duration for immutable images
   - Reduce bandwidth and improve performance

5. **Delete old images on update**
   - Clean up replaced images
   - Manage storage costs

### DON'T ❌

1. **Never store images in local filesystem**
   - Not scalable, deployment issues
   - Use R2 exclusively

2. **Never skip file validation**
   - Could allow malicious uploads
   - Could exceed storage limits

3. **Never leave orphaned R2 objects**
   - Always implement rollback logic
   - Track uploaded keys for cleanup

4. **Never expose R2 credentials to client**
   - Keep credentials server-side only

5. **Never trust file extensions**
   - Validate MIME type from buffer
   - File extensions can be spoofed

---

## Testing

### Manual Testing

```bash
# Upload test image
curl -X POST http://localhost:4941/api/v1/listings \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -F "images=@test-image.jpg" \
  -F "make=Toyota" \
  -F "model=Corolla" \
  ...

# Verify image accessible
curl -I https://motorix-images.ACCOUNT_ID.r2.cloudflarestorage.com/motorix/IMAGE_KEY.jpg
```

### Monitoring

- Check R2 dashboard for storage usage
- Monitor upload errors in application logs
- Set up alerts for failed uploads
- Track orphaned objects (uploaded but not in DB)

---

## Cost Optimization

**R2 Pricing** (as of 2024):
- Storage: $0.015 per GB/month
- Class A Operations (writes): $4.50 per million requests
- Class B Operations (reads): $0.36 per million requests
- Egress: **FREE** (key advantage over S3)

**Cost Reduction Strategies**:
1. Delete orphaned/unused images
2. Implement image compression
3. Batch operations where possible
4. Use CDN caching (automatic with custom domain)

---

## Migration from Other Storage

### From AWS S3

Change endpoint only:
```typescript
// Before (S3)
endpoint: undefined  // Uses AWS default

// After (R2)
endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
region: 'auto'
```

### From Local Filesystem

1. Upload existing images to R2
2. Update database URLs
3. Delete local files
4. Update code to use R2 upload functions
