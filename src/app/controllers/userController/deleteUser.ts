import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as userRepository from '../../repositories/userRepository';
import { comparePassword } from '../../utils/passwordHash';
import clearCookiesInResponse from '../../middlewares/requestAuthentication/clearCookiesInResponse';

async function deleteUser(req: Request, res: Response) {
	logger.info(`Deleting user with id '${req.params.id}'`);

	try {
		const { userId, currentPassword } = req.body;

		const user = await userRepository.getUserById(userId);

		if (user.length === 0) {
			res.statusMessage = 'Not found. No user with specified id';
			res.status(404).send();
			return;
		}

		if (!comparePassword(currentPassword, user[0].password)) {
			res.statusMessage = 'Forbidden. Invalid credentials';
			res.status(403).send();
			return;
		}

		const deleteUserResult = await userRepository.deleteUserWithId(userId);

		if (deleteUserResult.affectedRows === 1) {
			clearCookiesInResponse(res);
			res.statusMessage = 'User deleted successfully';
			res.status(200).send();
			return;
		}

		res.statusMessage = 'Not found. No user with specified id';
		res.status(404).send();
	} catch (error) {
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default deleteUser;
