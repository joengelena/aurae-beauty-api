import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { uploadSingleImage } from '../../utils/cloudflare/uploadImages';
import { validateFile } from '../../utils/cloudflare/validation';

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

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

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
}

export default updateUser;
