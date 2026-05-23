/**
 * Cloudflare R2 client wrapper
 *
 * Provides single-purpose functions for interacting with R2 storage.
 * Uses AWS SDK v3 since R2 is S3-compatible.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Config } from './config';

/**
 * Creates and configures S3 client for R2
 * R2 uses S3-compatible API with Cloudflare endpoint
 */
function createR2Client(): S3Client {
	return new S3Client({
		region: 'auto', // R2 uses 'auto' region
		endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: r2Config.accessKeyId,
			secretAccessKey: r2Config.secretAccessKey,
		},
	});
}

// Single R2 client instance
const r2Client = createR2Client();

/**
 * Sanitizes a filename for safe storage
 * Removes special characters and limits length
 */
function sanitizeFilename(filename: string): string {
	// Remove path traversal attempts and special characters
	const cleaned = filename
		.replace(/^.*[\\\/]/, '') // Remove path
		.replace(/[^a-zA-Z0-9.-]/g, '_'); // Replace unsafe chars

	// Limit filename length (max 100 chars)
	return cleaned.length > 100 ? cleaned.substring(0, 100) : cleaned;
}

/**
 * Generates a unique object key for storage
 * Format: aurae/{timestamp}-{random}-{filename}
 */
export function generateObjectKey(originalFilename: string): string {
	const timestamp = Date.now();
	const randomString = Math.random().toString(36).substring(2, 15);
	const sanitizedFilename = sanitizeFilename(originalFilename);

	return `aurae/${timestamp}-${randomString}-${sanitizedFilename}`;
}

/**
 * Determines content type from file mimetype
 * Defaults to application/octet-stream if unknown
 */
export function getContentType(mimetype: string): string {
	return mimetype || 'application/octet-stream';
}

/**
 * Builds public URL for an R2 object
 */
export function buildPublicUrl(key: string): string {
	return `${r2Config.publicUrl}/${key}`;
}

/**
 * Extracts R2 object key from a public URL
 *
 * @param url - Public URL of the R2 object
 * @returns Object key or null if URL is invalid
 *
 * @example
 * extractKeyFromUrl('https://cdn.example.com/aurae/12345-abc-image.jpg')
 * // Returns: 'aurae/12345-abc-image.jpg'
 */
export function extractKeyFromUrl(url: string): string | null {
	if (!url) return null;

	const publicUrlBase = r2Config.publicUrl;

	// Check if URL starts with the public URL base
	if (!url.startsWith(publicUrlBase)) {
		return null;
	}

	// Extract everything after the base URL and leading slash
	const key = url.substring(publicUrlBase.length + 1);

	return key || null;
}

/**
 * Uploads a single file buffer to R2
 *
 * @param buffer - File data as Buffer
 * @param key - Object key/path in R2
 * @param contentType - MIME type of the file
 * @returns Promise resolving to void
 * @throws Error if upload fails
 */
export async function uploadFileToR2(
	buffer: Buffer,
	key: string,
	contentType: string
): Promise<void> {
	const command = new PutObjectCommand({
		Bucket: r2Config.bucketName,
		Key: key,
		Body: buffer,
		ContentType: contentType,
		// Cache for 1 year (images rarely change)
		CacheControl: 'public, max-age=31536000, immutable',
	});

	await r2Client.send(command);
}

/**
 * Deletes a single object from R2
 *
 * @param key - Object key/path to delete
 * @returns Promise resolving to void
 * @throws Error if deletion fails
 */
export async function deleteFileFromR2(key: string): Promise<void> {
	const command = new DeleteObjectCommand({
		Bucket: r2Config.bucketName,
		Key: key,
	});

	await r2Client.send(command);
}

/**
 * Deletes multiple objects from R2
 * Executes deletions in parallel with concurrency control
 *
 * @param keys - Array of object keys to delete
 * @param concurrency - Maximum parallel deletions (default: 5)
 */
export async function deleteMultipleFilesFromR2(
	keys: string[],
	concurrency: number = 5
): Promise<void> {
	if (keys.length === 0) {
		return;
	}

	// Process deletions in batches to avoid overwhelming the service
	for (let i = 0; i < keys.length; i += concurrency) {
		const batch = keys.slice(i, i + concurrency);
		await Promise.all(batch.map((key) => deleteFileFromR2(key)));
	}
}
