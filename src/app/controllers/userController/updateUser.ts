import { Request, Response } from 'express';
import { PoolClient } from 'pg';
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

	// profile_photo_url is server-controlled: it is only ever set from an R2
	// upload below. Accepting it from the client would let a user point their
	// row at someone else's object and have the server delete it on the next
	// photo change. AJV already strips it; this is defence in depth.
	delete newUserData.profilePhotoUrl;

	logger.info(`Updating user with id '${currentUserId}'`);

	const file = req.file as Express.Multer.File | undefined;

	if (!file && Object.keys(newUserData).length === 0) {
		throw new AppError(400, 'No fields provided to update');
	}

	// Validate and confirm the account exists before anything touches R2
	if (file) {
		validateFile(file);

		const existingUsers = await userRepository.getUserById(currentUserId);
		if (existingUsers.length === 0) {
			throw new AppError(404, 'User not found');
		}
	}

	let uploadedKey: string | null = null;
	if (file) {
		logger.info(`Uploading profile photo: ${file.originalname} (${file.size} bytes)`);
		try {
			const uploadResult = await uploadSingleImage(file);
			uploadedKey = uploadResult.key;
			newUserData.profilePhotoUrl = uploadResult.url;
		} catch (uploadError: any) {
			logger.error(`Failed to upload profile photo: ${uploadError.message}`);
			throw new AppError(500, 'Unable to upload your photo. Please try again.');
		}
		logger.info(`Successfully uploaded profile photo: ${uploadedKey}`);
	}

	// The new photo never made it into the database, so don't leave it in R2
	const rollbackUpload = async (): Promise<void> => {
		if (!uploadedKey) return;
		try {
			await deleteFileFromR2(uploadedKey);
		} catch (r2Error) {
			const msg = r2Error instanceof Error ? r2Error.message : 'Unknown error';
			logger.error(`Failed to roll back uploaded profile photo from R2: ${msg}`);
		}
	};

	let oldProfilePhotoUrl: string | null = null;
	let connection: PoolClient;
	try {
		connection = await getPool().connect();
	} catch (connectError: any) {
		await rollbackUpload();
		logger.error(`Failed to acquire DB connection for user update: ${connectError.message}`);
		throw new AppError(500, 'Unable to update your profile. Please try again.');
	}

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
	} catch (error: any) {
		await connection.query('ROLLBACK').catch((rollbackError: any) => {
			logger.error(`Failed to roll back user update: ${rollbackError.message}`);
		});

		await rollbackUpload();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during user update: ${error.message}`);
		throw new AppError(500, 'Unable to update your profile. Please try again.');
	} finally {
		connection.release();
	}

	res.status(200).send({
		message: 'User updated successfully',
	});

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
