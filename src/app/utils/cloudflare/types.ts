/**
 * TypeScript type definitions for Cloudflare R2 integration
 */

export interface IR2Config {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucketName: string;
	publicUrl: string;
}

export interface IUploadImageResult {
	url: string;
	key: string;
	size: number;
}

export interface IUploadImagesResult {
	urls: string[];
	keys: string[];
	totalSize: number;
}
