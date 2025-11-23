/**
 * Image upload handler for Cloudflare R2
 *
 * Handles uploading multiple images to R2 storage with proper error handling
 * and rollback capabilities.
 */

import logger from '../../../config/logger';
import {
	uploadFileToR2,
	deleteMultipleFilesFromR2,
	generateObjectKey,
	getContentType,
	buildPublicUrl,
} from './r2Client';
import { UploadImagesResult } from './types';

/**
 * Uploads a single image to R2
 *
 * @param file - Multer file object containing buffer and metadata
 * @returns Object with URL, key, and size
 */
async function uploadSingleImage(file: Express.Multer.File): Promise<{
	url: string;
	key: string;
	size: number;
}> {
	const key = generateObjectKey(file.originalname);
	const contentType = getContentType(file.mimetype);

	await uploadFileToR2(file.buffer, key, contentType);

	const url = buildPublicUrl(key);

	return {
		url,
		key,
		size: file.size,
	};
}

/**
 * Uploads multiple images to R2 storage
 *
 * Preserves file order from the original request.
 * If any upload fails, already uploaded files are deleted (rollback).
 *
 * @param files - Array of Multer file objects
 * @returns Object containing URLs, keys, and total size
 * @throws Error if upload fails (after rollback cleanup)
 */
async function uploadImages(
	files: Express.Multer.File[]
): Promise<UploadImagesResult> {
	const uploadedFiles: { url: string; key: string; size: number }[] = [];

	try {
		// Upload files sequentially to preserve order
		for (const file of files) {
			logger.info(`Uploading image: ${file.originalname} (${file.size} bytes)`);

			const result = await uploadSingleImage(file);
			uploadedFiles.push(result);

			logger.info(`Successfully uploaded: ${result.key}`);
		}

		const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);

		logger.info(
			`All ${files.length} images uploaded successfully. Total size: ${totalSize} bytes`
		);

		return {
			urls: uploadedFiles.map((file) => file.url),
			keys: uploadedFiles.map((file) => file.key),
			totalSize,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		logger.error(`Image upload failed: ${errorMessage}`);

		// Rollback: Delete already uploaded files
		if (uploadedFiles.length > 0) {
			logger.warn(
				`Rolling back: Deleting ${uploadedFiles.length} uploaded file(s)`
			);

			try {
				const keysToDelete = uploadedFiles.map((file) => file.key);
				await deleteMultipleFilesFromR2(keysToDelete);
				logger.info('Rollback successful');
			} catch (rollbackError) {
				const rollbackMessage =
					rollbackError instanceof Error
						? rollbackError.message
						: 'Unknown error';
				logger.error(`Rollback failed: ${rollbackMessage}`);
				// Continue to throw original error even if rollback fails
			}
		}

		throw error;
	}
}

export default uploadImages;
export { uploadSingleImage };
