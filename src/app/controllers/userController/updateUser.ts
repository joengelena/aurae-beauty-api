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

		res.status(200).send();
		return;
	} catch (error) {
		logger.error('Error updating user: ', error);
		res.status(500).send('Internal server error');
		return;
	}
}

export default updateUser;
