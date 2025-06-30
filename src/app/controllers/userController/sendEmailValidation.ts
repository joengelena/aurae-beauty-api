import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as userRepository from '../../repositories/userRepository/userRepository';
import * as appConfigRepository from '../../repositories/appConfigurationRepository/appConfigurationRepository';
import { sendEmailVerificationLink } from '../../utils/email/emailService';

async function sendEmailValidation(req: Request, res: Response) {
	logger.info('Sending email verification link');

	try {
		const currentUserId = req.body.currentUserId;

		const user = await userRepository.getUserById(currentUserId);

		if (user.length === 0) {
			res.status(404).send('Not found. No user with specified email');
			return;
		}

		const appConfig = await appConfigRepository.getAppConfig();

		await sendEmailVerificationLink(user[0].id, user[0].email);

		res.status(200).send();
		return;
	} catch (error) {
		logger.error(`Error sending email validation link: ${error}`);

		if (error.name === 'NodeMailerError') {
			res.status(500).send('Internal error sending email');
			return;
		}

		res.status(500).send('Internal server error');
		return;
	}
}

export default sendEmailValidation;
