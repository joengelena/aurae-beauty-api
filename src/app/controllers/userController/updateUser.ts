import { Request, Response } from 'express';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function updateUser(req: Request, res: Response): Promise<void> {
	const { currentUserId, ...newUserData } = req.body;

	logger.info(`Updating user with id '${currentUserId}'`);

	try {
		await userRepository.updateUser({
			id: currentUserId,
			...newUserData,
		});

		res.status(200).send({
			message: 'User updated successfully',
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during user update: ${error.message}`);
		throw new AppError(500, 'Unable to update your profile. Please try again.');
	}
}

export default updateUser;
