import { Request, Response } from 'express';
import * as userRepository from '../../repositories/userRepository';
import logger from '../../../config/logger';

async function viewUser(req: Request, res: Response): Promise<void> {
	logger.info(`Viewing user with id '${req.body.currentUserId}'`);

	try {
		const currentUserId = req.body.currentUserId;
		const users = await userRepository.getUserById(currentUserId);

		if (users.length === 0) {
			res.statusMessage = 'Not found. No user with specified id';
			res.status(404).send();
			return;
		}

		const user = {
			firstName: users[0].first_name,
			lastName: users[0].last_name,
			username: users[0].username,
			phoneNumber: users[0].phone_number,
			email: users[0].email,
		};

		res.statusMessage = 'User found';
		res.status(200).send(user);
		return;
	} catch (error) {
		logger.error(`Error viewing user: ${error}`);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default viewUser;
