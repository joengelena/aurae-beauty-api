import logger from '../../../config/logger';
import clearCookiesInResponse from '../../middlewares/requestAuthentication/clearCookiesInResponse';
import * as userRepository from '../../repositories/userRepository/userRepository';
import { Request, Response } from 'express';

async function signOutUser(req: Request, res: Response): Promise<void> {
	logger.info(`Signing out user with id '${req.params.userId}'`);

	try {
		const { currentUserId } = req.body;

		const user = await userRepository.getUserById(currentUserId);

		if (user.length === 0) {
			res.statusMessage = 'Forbidden. Invalid credentials';
			res.status(403).send();
			return;
		}

		const authTokenDeleteResult =
			await userRepository.deleteAuthTokenForUserId(currentUserId);

		if (authTokenDeleteResult.affectedRows === 1) {
			clearCookiesInResponse(res);
			res.statusMessage = 'User signed out successfully';
			res.status(200).send({
				message: 'User signed out successfully',
			});
			return;
		}
	} catch (error) {
		logger.error(`Error signing out user: ${error}`);
		res.statusMessage = 'Internal Server Error';
		res.status(500).send();
		return;
	}
}

export default signOutUser;
