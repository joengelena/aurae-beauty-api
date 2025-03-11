import { Request, Response } from 'express';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';

async function updateUser(req: Request, res: Response): Promise<void> {
	try {
		logger.info(`Updating user with id '${req.body.currentUserId}'`);
		const { currentUserId, ...newUserData } = req.body;

		await userRepository.updateUser({
			id: currentUserId,
			...newUserData,
		});

		res.statusMessage = 'User updated successfully';
		res.status(200).send({
			message: 'User updated successfully',
		});
		return;
	} catch (error) {
		logger.error('Error updating user: ', error);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default updateUser;
