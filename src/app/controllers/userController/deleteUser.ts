import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as userRepository from '../../repositories/userRepository/userRepository';
import { comparePassword } from '../../utils/passwordHash';
import clearCookiesInResponse from '../../middlewares/requestAuthentication/clearCookiesInResponse';

async function deleteUser(req: Request, res: Response) {
	logger.info(`Deleting user with id '${req.params.id}'`);

	try {
		const { currentUserId, currentPassword } = req.body;

		const user = await userRepository.getUserById(currentUserId);

		if (user.length === 0) {
			res.status(404).send('Not found. No user with specified id');
			return;
		}

		if (!comparePassword(currentPassword, user[0].password)) {
			res.status(403).send('Forbidden. Invalid credentials');
			return;
		}

		const deleteUserResult = await userRepository.deleteUserWithId(
			currentUserId
		);

		if (deleteUserResult.affectedRows === 1) {
			clearCookiesInResponse(res);
			res.status(200).send();
			return;
		}

		res.status(404).send('Not found. No user with specified id');
		return;
	} catch (error) {
		logger.error(`Error deleting user: ${error}`);
		res.status(500).send('Internal server error');
		return;
	}
}

export default deleteUser;
