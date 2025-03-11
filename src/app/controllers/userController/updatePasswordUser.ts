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
			res.statusMessage = 'Not found. No user with specified id';
			res.status(404).send();
			return;
		}

		if (!comparePassword(currentPassword, user[0].password)) {
			res.statusMessage = 'Forbidden. Invalid credentials';
			res.status(403).send();
			return;
		}

		const hashedNewPassword = await hashPassword(newPassword);

		await userRepository.updateUser({
			id: currentUserId,
			password: hashedNewPassword,
		});

		res.statusMessage = 'User password updated successfully';
		res.status(200).send({
			message: 'User password updated successfully',
		});
		return;
	} catch (error) {
		logger.error(`Error updating user password: ${error.message}`);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default updatePasswordUser;
