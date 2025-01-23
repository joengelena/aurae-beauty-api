import { Request, Response } from 'express';
import logger from '../../../config/logger';
import sendEmail from '../../utils/email/nodemailer';
import * as userRepository from '../../repositories/userRepository';
import sendEmailValidationEmail from '../../utils/email/nodemailer';
import { generateJwtToken } from '../../utils/jwt/generateJwt';
import generateEmailVerificationLink from '../../utils/generateEmailVerificationLink';
import { sendEmailVerificationLink } from '../../utils/email/emailService';

async function sendEmailValidation(req: Request, res: Response) {
	logger.info('Validating email');

	try {
		const { email, emailVerificationBaseUrl } = req.body;

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

		await sendEmailVerificationLink(
			user[0].id,
			email,
			user[0].first_name,
			user[0].last_name,
			emailVerificationBaseUrl
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
