import { Request, Response } from 'express';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function viewUser(req: Request, res: Response): Promise<void> {
	const userId = req.params.userId;

	logger.info(`Viewing user with id '${userId}'`);

	try {
		const users = await userRepository.getUserById(userId);

		if (users.length === 0) {
			throw new AppError(404, 'User not found.');
		}

		const user = {
			firstName: users[0].firstName,
			lastName: users[0].lastName,
			phoneNumber: users[0].phoneNumber,
			email: users[0].email,
			location: users[0].location,
			profilePhotoUrl: users[0].profilePhotoUrl,
		};

		res.status(200).send(user);
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during view user: ${error.message}`);
		throw new AppError(
			500,
			'Unable to load user profile. Please try again.',
		);
	}
}

export default viewUser;
