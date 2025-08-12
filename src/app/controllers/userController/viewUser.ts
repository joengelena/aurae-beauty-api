import { Request, Response } from 'express';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';

async function viewUser(req: Request, res: Response): Promise<void> {
	const userId = req.params.userId;

	try {
		const users = await userRepository.getUserById(userId);

		if (users.length === 0) {
			res.status(404).send('Not found. No user with specified id');
			return;
		}

		const user = {
			firstName: users[0].firstName,
			lastName: users[0].lastName,
			username: users[0].username,
			phoneNumber: users[0].phoneNumber,
			email: users[0].email,
		};

		res.status(200).send(user);
		return;
	} catch (error) {
		logger.error(`Error viewing user: ${error}`);
		res.status(500).send('Internal server error');
		return;
	}
}

export default viewUser;
