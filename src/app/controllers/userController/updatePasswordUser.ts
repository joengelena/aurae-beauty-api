import logger from '../../../config/logger';
import { Request, Response } from 'express';
import { comparePassword, hashPassword } from '../../utils/passwordHash';
import * as userRepository from '../../repositories/userRepository/userRepository';

async function updatePasswordUser(req: Request, res: Response): Promise<void> {
	try {
		logger.info(
			`Updating user password for user id '${req.params.userId}'`
		);

		const { currentUserId, currentPassword, newPassword } = req.body;

		const user = await userRepository.getUserById(currentUserId);

		if (user.length === 0) {
			res.status(404).send('Not found. No user with specified id');
			return;
		}

		if (!comparePassword(currentPassword, user[0].password)) {
			res.status(403).send('Forbidden. Invalid credentials');
			return;
		}

		const hashedNewPassword = await hashPassword(newPassword);

		await userRepository.updateUser({
			id: currentUserId,
			password: hashedNewPassword,
		});

		res.status(200).send();
		return;
	} catch (error) {
		logger.error(`Error updating user password: ${error.message}`);
		res.status(500).send('Internal server error');
		return;
	}
}

export default updatePasswordUser;
