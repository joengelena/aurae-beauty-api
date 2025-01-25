import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as userRepository from '../../repositories/userRepository';
import * as appConfigRepository from '../../repositories/appConfigurationRepository';
import { sendEmailVerificationLink } from '../../utils/email/emailService';

async function sendEmailValidation(req: Request, res: Response) {
	logger.info('Sending email verification link');

	try {
		const { email } = req.body;

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		if (!emailRegex.test(email)) {
			res.statusMessage = 'Invalid email format';
			res.status(400).send();
			return;
		}

		const user = await userRepository.getUserByEmail(email);

		if (user.length === 0) {
			logger.info('User not found');
			res.statusMessage = 'Not found. No user with specified email';
			res.status(404).send();
			return;
		}

		const emailVerificationBaseUrl =
			await appConfigRepository.getWebAppBaseUrl();

		await sendEmailVerificationLink(
			user[0].id,
			email,
			emailVerificationBaseUrl[0].value
		);

		res.statusMessage = 'Email validation link sent successfully';
		res.status(200).send();
	} catch (error) {
		logger.error(
			`Error sending email about email validation link: ${error}`
		);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
	}
}

export default sendEmailValidation;
