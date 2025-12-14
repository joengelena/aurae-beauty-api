import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function updateUser(req: Request, res: Response): Promise<void> {
	const { currentUserId, ...newUserData } = req.body;

	logger.info(`Updating user with id '${currentUserId}'`);

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
