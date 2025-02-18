import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as userRepository from '../../repositories/userRepository';
import * as appConfigRepository from '../../repositories/appConfigurationRepository';
import { sendEmailVerificationLink } from '../../utils/email/emailService';

async function sendEmailValidation(req: Request, res: Response) {
	logger.info('Sending email verification link');

	try {
		const currentUserId = req.body.currentUserId;

		const user = await userRepository.getUserById(currentUserId);

		if (user.length === 0) {
			logger.info('User not found');
			res.statusMessage = 'Not found. No user with specified email';
			res.status(404).send();
			return;
		}

		const appConfig = await appConfigRepository.getAppConfig();

		await sendEmailVerificationLink(
			user[0].id,
			user[0].email,
			appConfig.find((config) => config.name === 'webAppBaseUrl').value,
			appConfig.find((config) => config.name === 'verifyEmailUrlPath')
				.value
		);

		res.statusMessage = 'Email validation link sent successfully';
		res.status(200).send();
		return;
	} catch (error) {
		logger.error(`Error sending email validation link: ${error}`);

		if (error.name == 'NodeMailerError') {
			res.statusMessage = 'Internal error sending email';
			res.status(500).send();
			return;
		}

		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default sendEmailValidation;
