import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as userRepository from '../../repositories/userRepository';
import * as appConfigRepository from '../../repositories/appConfigurationRepository';
import {
	sendEmailVerificationLink,
	sendResetPasswordLink,
} from '../../utils/email/emailService';

async function forgotPassword(req: Request, res: Response) {
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

		const appConfig = await appConfigRepository.getAppConfig();
		const webAppBaseUrl = appConfig.find(
			(config) => config.name === 'webAppBaseUrl'
		).value;

		if (user[0].email_validated === 0) {
			await sendEmailVerificationLink(
				user[0].id,
				email,
				webAppBaseUrl,
				appConfig.find((config) => config.name === 'verifyEmailUrlPath')
					.value
			);

			res.statusMessage = 'Email verification link sent successfully';
			res.status(200).send();
			return;
		}

		await sendResetPasswordLink(
			user[0].id,
			email,
			user[0].password,
			webAppBaseUrl,
			appConfig.find((config) => config.name === 'resetPasswordUrlPath')
				.value
		);

		res.statusMessage = 'Reset password link sent successfully';
		res.status(200).send();
		return;
	} catch (error) {
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default forgotPassword;
