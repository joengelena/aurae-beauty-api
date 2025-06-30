import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as userRepository from '../../repositories/userRepository/userRepository';
import {
	sendEmailVerificationLink,
	sendResetPasswordLink,
} from '../../utils/email/emailService';

async function forgotPassword(req: Request, res: Response) {
	try {
		logger.info(
			'Processing forgot password request for user with email: ' +
				req.body.email
		);

		const { email } = req.body;

		const user = await userRepository.getUserByEmail(email);

		if (user.length === 0) {
			res.status(404).send('Not found. No user with specified email');
			return;
		}

		if (user[0].isEmailVerified === 0) {
			await sendEmailVerificationLink(user[0].id, email);
			res.status(200).send('Email verification link sent successfully');
			return;
		}

		await sendResetPasswordLink(user[0].id, email);

		res.status(200).send('Reset password link sent successfully');
		return;
	} catch (error) {
		logger.error(`Error processing forgot password request: ${error}`);

		if (error.name === 'NodeMailerError') {
			res.status(500).send('Internal error sending email');
			return;
		}

		res.status(500).send('Internal server error');
		return;
	}
}

export default forgotPassword;
