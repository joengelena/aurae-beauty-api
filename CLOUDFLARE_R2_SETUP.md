# Cloudflare R2 Setup Guide

This guide explains how to set up Cloudflare R2 for the Motorix API.

## Overview

Cloudflare R2 is used as the image storage solution for the Motorix API. R2 is an S3-compatible object storage service with zero egress fees.

## Prerequisites

- Cloudflare account
- Active Cloudflare R2 subscription (free tier available)

---

## Step 1: Create R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage** in the left sidebar
3. Click **Create bucket**
4. Enter bucket name: `motorix-images` (or your preferred name)
5. Choose location: **Automatic** (recommended)
6. Click **Create bucket**

---

## Step 2: Enable Public Access (Required)

By default, R2 buckets are private. To allow public image access:

### Option A: R2.dev Subdomain (Easiest)

1. Go to your bucket settings
2. Click **Settings** tab
3. Under **Public access**, click **Allow Access**
4. Click **Enable R2.dev subdomain**
5. Note the public URL (e.g., `https://pub-abc123.r2.dev`)

### Option B: Custom Domain (Advanced)

1. Go to your bucket settings
2. Click **Settings** > **Custom Domains**
3. Click **Connect Domain**
4. Enter your domain (e.g., `images.motorix.com`)
5. Follow DNS setup instructions
6. Use this domain in `R2_PUBLIC_DOMAIN` environment variable

---

## Step 3: Create API Token

1. In Cloudflare Dashboard, go to **R2 Object Storage**
2. Click **Manage R2 API Tokens** (top right)
3. Click **Create API token**
4. Configure token:
   - **Token name**: `motorix-api-token`
   - **Permissions**:
     - ✅ Object Read & Write
     - ✅ (Optional) Object Delete (for cleanup/rollback)
   - **Specify bucket**: Select `motorix-images`
   - **TTL**: Never expire (or set expiration date)
5. Click **Create API Token**
6. **IMPORTANT**: Copy the credentials immediately (shown only once):
   - Access Key ID
   - Secret Access Key
   - Account ID

---

## Step 4: Configure Environment Variables

Update your `.env` file with the R2 credentials:

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=motorix-images

# Optional: Custom domain (if using Option B above)
R2_PUBLIC_DOMAIN=https://images.motorix.com
# OR leave empty to use default R2.dev URL:
R2_PUBLIC_DOMAIN=
```

**Security Note**: Never commit your `.env` file to version control!

---

## Step 5: Install Dependencies

Install the AWS SDK (R2 is S3-compatible):

```bash
cd motorix-api
npm install
```

The `@aws-sdk/client-s3` package is already added to `package.json`.

---

## Step 6: Test the Integration

### Start the API

```bash
npm run dev
```

### Test Image Upload

Use a tool like Postman or cURL:

```bash
curl -X POST http://localhost:4941/api/v1/listings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "make=Toyota" \
  -F "model=Corolla" \
  -F "price=15000" \
  # ... other listing fields
```

**Expected Response:**

```json
{
  "listingId": 123
}
```

### Verify Upload

1. Go to Cloudflare Dashboard > R2 > `motorix-images` bucket
2. You should see files in the `motorix/` folder with format:
   - `motorix/1699999999999-abc123xyz-image1.jpg`
3. Test public URL in browser:
   - `https://pub-abc123.r2.dev/motorix/1699999999999-abc123xyz-image1.jpg`

---

## Architecture Overview

### File Structure

```
src/app/utils/cloudflare/
├── types.ts          # TypeScript type definitions
├── config.ts         # R2 configuration & validation
├── r2Client.ts       # Single-purpose R2 functions
└── uploadImages.ts   # Main upload handler with rollback
```

### Upload Flow

1. **Client** sends multipart form data with images
2. **Multer** middleware parses files into memory buffers
3. **uploadImages()** processes each file:
   - Generates unique key: `motorix/{timestamp}-{random}-{filename}`
   - Uploads buffer to R2 via S3 API
   - Returns public URL
4. **Controller** saves URLs to database
5. **Rollback**: If database insert fails, uploaded images are deleted

### Key Features

✅ **Sequential uploads** - Preserves image order
✅ **Automatic rollback** - Deletes images if DB insert fails
✅ **Unique filenames** - Prevents collisions
✅ **Organized storage** - All images in `motorix/` folder
✅ **Single-purpose functions** - Clean, reusable code
✅ **Comprehensive logging** - Winston logs every step
✅ **Type safety** - Full TypeScript support

---

## Pricing

| Resource | Cost |
|---------|------|
| **Storage** | $0.015/GB/month |
| **Egress** | **$0** (unlimited bandwidth) |
| **Operations** | $0.36/million writes |

**R2 Advantages:**
- ✅ Zero egress fees (unlimited bandwidth)
- ✅ S3-compatible (standard API)
- ✅ Cost-effective pricing at scale
- ✅ Cloudflare's global network

---

## Troubleshooting

### Error: "Missing required environment variable"

**Cause**: R2 credentials not set in `.env`
**Fix**: Double-check all four required variables are present

### Error: "Access Denied"

**Cause**: API token lacks permissions or bucket access
**Fix**:
1. Verify token has "Object Read & Write" permissions
2. Ensure token is scoped to correct bucket
3. Try creating a new token

### Error: "NoSuchBucket"

**Cause**: Bucket name mismatch
**Fix**: Verify `R2_BUCKET_NAME` matches actual bucket name (case-sensitive)

### Images Upload but Return 404

**Cause**: Public access not enabled
**Fix**: Enable R2.dev subdomain or configure custom domain

### Error: "Network timeout"

**Cause**: Large files or slow connection
**Fix**:
- Implement client-side image compression
- Increase timeout in Multer config
- Use R2 multipart upload for files >100MB

---

## Security Best Practices

1. ✅ **Never expose API credentials** - Store in `.env` only
2. ✅ **Use bucket-scoped tokens** - Don't grant account-wide access
3. ✅ **Enable CORS** - Configure allowed origins in R2 bucket settings
4. ✅ **Rotate tokens regularly** - Create new tokens every 90 days
5. ✅ **Monitor usage** - Set up billing alerts in Cloudflare
6. ✅ **Validate file types** - Add MIME type validation (TODO)
7. ✅ **Limit file sizes** - Configure max size in Multer (currently unlimited)

---

## Next Steps (Optional Improvements)

### 1. Add File Validation

```typescript
// In postListing controller
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

for (const file of files) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new AppError(400, 'Invalid file type');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(400, 'File too large');
  }
}
```

### 2. Parallel Uploads (Faster)

```typescript
// In uploadImages.ts
const uploadPromises = files.map(file => uploadSingleImage(file));
const results = await Promise.all(uploadPromises);
// Note: May lose file order - need to track indices
```

### 3. Image Optimization

- Use Cloudflare Images Transform (paid)
- Or compress client-side before upload
- Or use Sharp library server-side

### 4. CDN Caching

- R2 automatically uses Cloudflare CDN
- Adjust cache headers in `PutObjectCommand`:
  ```typescript
  CacheControl: 'public, max-age=31536000'
  ```

---

## Support

**R2 Documentation**: https://developers.cloudflare.com/r2/
**AWS SDK for JavaScript**: https://docs.aws.amazon.com/sdk-for-javascript/v3/

For issues, check logs in `logs/app.log` and `logs/error.log`.
