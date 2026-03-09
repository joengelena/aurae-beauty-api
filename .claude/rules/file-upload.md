# File Upload Rules

## Hard Rules

1. **NEVER store images in local filesystem**
   - Cloudflare R2 is the ONLY image storage
   - No `/uploads` folder, no local file writes
   - All image URLs point to R2

2. **NEVER skip file validation before upload**
   ```typescript
   // ALWAYS validate first
   validateFiles(files);  // Checks size, type, count
   const result = await uploadImages(files);
   ```

3. **NEVER leave orphaned R2 objects**
   ```typescript
   const uploadResult = await uploadImages(files);
   try {
     await connection.query('BEGIN');
     await repository.saveUrls(uploadResult.urls, connection);
     await connection.query('COMMIT');
   } catch (error) {
     await connection.query('ROLLBACK');
     await deleteImages(uploadResult.keys);  // CLEAN UP R2
     throw error;
   }
   ```

4. **NEVER process files without Multer middleware**
   - File validation assumes Multer has parsed files
   - Always add `uploadMulter.array()` or `uploadMulter.single()` to route

5. **NEVER accept files exceeding limits**
   - Max 10 files per request
   - Max 10MB per file
   - Only JPEG, PNG, WebP, HEIC/HEIF

## File Processing Order

1. Multer middleware captures files to memory
2. Validate file count, size, MIME type
3. Upload to R2 (returns URLs and keys)
4. BEGIN transaction
5. Save URLs to database
6. COMMIT transaction
7. On error: ROLLBACK + delete from R2

## Key Format

```
motorix/{timestamp}-{random}-{sanitized-filename}
Example: motorix/1704067200000-a1b2c3d4e5f-image.jpg
```
