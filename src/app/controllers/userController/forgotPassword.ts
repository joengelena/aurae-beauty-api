import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as userRepository from '../../repositories/userRepository';

async function forgotPasswordUser(req: Request, res: Response) {
	try {
		logger.info(
			'Processing forgot password request for user: ',
			req.params.id
		);

		const { email } = req.body;

		const user = await userRepository.getUserByEmail(email);

		if (user.length === 0) {
			res.statusMessage = 'Not found. No user with specified email';
			res.status(404).send();
			return;
		}

		if (user[0].email_validated === 0) {
		}
	} catch (error) {
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default forgotPasswordUser;
