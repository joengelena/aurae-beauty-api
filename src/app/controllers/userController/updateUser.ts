import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { uploadSingleImage } from '../../utils/cloudflare/uploadImages';
import { validateFile } from '../../utils/cloudflare/validation';
import {
	extractKeyFromUrl,
	deleteFileFromR2,
} from '../../utils/cloudflare/r2Client';

async function updateUser(req: Request, res: Response): Promise<void> {
	const { currentUserId, ...newUserData } = req.body;

	logger.info(`Updating user with id '${currentUserId}'`);

	// Handle image upload if provided
	const file = req.file as Express.Multer.File | undefined;
	if (file) {
		validateFile(file);
		logger.info(`Uploading profile photo: ${file.originalname} (${file.size} bytes)`);
		const uploadResult = await uploadSingleImage(file);
		newUserData.profilePhotoUrl = uploadResult.url;
		logger.info(`Successfully uploaded profile photo: ${uploadResult.key}`);
	}

	let oldProfilePhotoUrl: string | null = null;
	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		// Fetch old profile photo URL if a new image is being uploaded
		if (file) {
			const users = await userRepository.getUserById(
				currentUserId,
				connection
			);

			if (users.length === 0) {
				throw new AppError(404, 'User not found');
			}

			oldProfilePhotoUrl = users[0].profilePhotoUrl;
			logger.info(
				`Old profile photo URL: ${
					oldProfilePhotoUrl ? 'exists' : 'none'
				}`
			);
		}

		await userRepository.updateUser(
			{
				id: currentUserId,
				...newUserData,
			},
			connection
		);

		await connection.query('COMMIT');
		connection.release();

		res.status(200).send({
			message: 'User updated successfully',
		});
	} catch (error) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during user update: ${error.message}`);
		throw new AppError(500, 'Unable to update your profile. Please try again.');
	}

	// Delete old image from R2 after successful database update
	if (file && oldProfilePhotoUrl) {
		try {
			const key = extractKeyFromUrl(oldProfilePhotoUrl);

			if (key) {
				logger.info(
					`Deleting old profile photo from R2 storage: ${key}`
				);
				await deleteFileFromR2(key);
				logger.info(
					'Successfully deleted old profile photo from R2 storage'
				);
			}
		} catch (r2Error) {
			// Log error but don't fail the request since DB update succeeded
			const errorMessage =
				r2Error instanceof Error ? r2Error.message : 'Unknown error';
			logger.error(
				`Failed to delete old profile photo from R2: ${errorMessage}`
			);
			logger.warn(
				'User profile updated in database but old photo remains in R2 storage'
			);
		}
	}
}

export default updateUser;
