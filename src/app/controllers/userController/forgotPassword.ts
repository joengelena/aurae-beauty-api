import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as userRepository from '../../repositories/userRepository';
import * as appConfigRepository from '../../repositories/appConfigurationRepository';
import { sendEmailVerificationLink } from '../../utils/email/emailService';

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
			const emailVerificationBaseUrl =
				await appConfigRepository.getWebAppBaseUrl();

			await sendEmailVerificationLink(
				user[0].id,
				email,
				emailVerificationBaseUrl[0].value
			);

			res.statusMessage = 'Email verification link sent successfully';
			res.status(200).send();
			return;
		}

		// Send an email to reset their password
	} catch (error) {
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default forgotPasswordUser;
