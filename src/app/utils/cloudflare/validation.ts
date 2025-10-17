/**
 * File validation utilities for image uploads
 *
 * Provides validation functions for file type, size, and count
 */

import AppError from '../errors/appError';

/**
 * Configuration for file validation
 */
export const FILE_VALIDATION_CONFIG = {
	MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB per file
	MAX_FILES: 10, // Maximum number of files
	ALLOWED_MIME_TYPES: [
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/webp',
		'image/heic',
		'image/heif',
	] as const,
} as const;

/**
 * Validates file MIME type
 * @throws AppError if MIME type is not allowed
 */
function validateMimeType(file: Express.Multer.File): void {
	if (!FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
		throw new AppError(
			400,
			`Invalid file type: ${file.mimetype}. Allowed types: ${FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`
		);
	}
}

/**
 * Validates file size
 * @throws AppError if file exceeds maximum size
 */
function validateFileSize(file: Express.Multer.File): void {
	if (file.size > FILE_VALIDATION_CONFIG.MAX_FILE_SIZE) {
		const maxSizeMB = FILE_VALIDATION_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
		const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
		throw new AppError(
			400,
			`File "${file.originalname}" is too large (${fileSizeMB}MB). Maximum size: ${maxSizeMB}MB`
		);
	}
}

/**
 * Validates number of files
 * @throws AppError if file count exceeds maximum
 */
function validateFileCount(files: Express.Multer.File[]): void {
	if (files.length > FILE_VALIDATION_CONFIG.MAX_FILES) {
		throw new AppError(
			400,
			`Too many files (${files.length}). Maximum allowed: ${FILE_VALIDATION_CONFIG.MAX_FILES}`
		);
	}
}

/**
 * Validates that at least one file is provided
 * @throws AppError if no files provided
 */
function validateMinimumFiles(files: Express.Multer.File[]): void {
	if (files.length === 0) {
		throw new AppError(400, 'Please upload at least one image for your listing.');
	}
}

/**
 * Validates a single file
 * Checks MIME type and file size
 * @throws AppError if validation fails
 */
export function validateFile(file: Express.Multer.File): void {
	validateMimeType(file);
	validateFileSize(file);
}

/**
 * Validates multiple files
 * Checks file count, and validates each individual file
 * @throws AppError if validation fails
 */
export function validateFiles(files: Express.Multer.File[]): void {
	validateMinimumFiles(files);
	validateFileCount(files);

	// Validate each file individually
	for (const file of files) {
		validateFile(file);
	}
}

/**
 * Formats bytes to human-readable size
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
