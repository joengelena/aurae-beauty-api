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
			res.status(403).send('Forbidden. Invalid credentials');
			return;
		}

		const authTokenDeleteResult =
			await userRepository.deleteAuthTokenForUserId(currentUserId);

		if (authTokenDeleteResult.affectedRows === 1) {
			clearCookiesInResponse(res);
			res.status(200).send();
			return;
		}
	} catch (error) {
		logger.error(`Error signing out user: ${error}`);
		res.status(500).send('Internal Server Error');
		return;
	}
}

export default signOutUser;
