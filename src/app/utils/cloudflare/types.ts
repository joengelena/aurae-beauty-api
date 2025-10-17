/**
 * TypeScript type definitions for Cloudflare R2 integration
 */

export interface R2Config {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucketName: string;
	publicUrl: string;
}

export interface UploadImageResult {
	url: string;
	key: string;
	size: number;
}

export interface UploadImagesResult {
	urls: string[];
	keys: string[];
	totalSize: number;
}
