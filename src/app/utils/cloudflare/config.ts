/**
 * Cloudflare R2 configuration
 *
 * Validates and exports R2 configuration from environment variables.
 * R2 is Cloudflare's S3-compatible object storage service.
 */

import { R2Config } from './types';

/**
 * Validates that a required environment variable exists
 * @throws Error if environment variable is missing
 */
function getRequiredEnvVar(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

/**
 * Constructs the public URL for R2 bucket
 * Format: https://pub-{hash}.r2.dev or custom domain
 */
function buildPublicUrl(): string {
	const customDomain = process.env.R2_PUBLIC_DOMAIN?.trim();

	if (customDomain) {
		const normalizedDomain = customDomain.startsWith('http')
			? customDomain
			: `https://${customDomain}`;

		// Remove trailing slash for consistency
		return normalizedDomain.replace(/\/$/, '');
	}

	// Default R2 public URL format
	const accountId = process.env.R2_ACCOUNT_ID;
	const bucketName = process.env.R2_BUCKET_NAME;
	return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`;
}

/**
 * R2 configuration object
 * Initialized once at module load time
 */
export const r2Config: R2Config = {
	accountId: getRequiredEnvVar('R2_ACCOUNT_ID'),
	accessKeyId: getRequiredEnvVar('R2_ACCESS_KEY_ID'),
	secretAccessKey: getRequiredEnvVar('R2_SECRET_ACCESS_KEY'),
	bucketName: getRequiredEnvVar('R2_BUCKET_NAME'),
	publicUrl: buildPublicUrl(),
};
