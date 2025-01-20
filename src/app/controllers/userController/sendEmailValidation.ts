import { Request, Response } from 'express';
import logger from '../../../config/logger';
import sendEmail from '../../utils/email/nodemailer';
import * as userModel from '../../models/user.model';
import sendEmailValidationEmail from '../../utils/email/nodemailer';
import { generateJwtToken } from '../../utils/jwt/generateJwt';
import generateEmailVerificationLink from '../../utils/generateEmailVerificationLink';

async function sendEmailValidation(req: Request, res: Response) {
	logger.info('Validating email');

	try {
		const { email, emailValidationBaseUrl } = req.body;

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		if (!emailRegex.test(email)) {
			res.statusMessage = 'Invalid email format';
			res.status(400).send();
			return;
		}

		const user = await userModel.getUserByEmail(email);

		if (user.length === 0) {
			logger.info('User not found');
			res.statusMessage = 'Not found. No user with specified email';
			res.status(404).send();
			return;
		}

		const emailValidationJwt = generateJwtToken(
			{ userId: user[0].id, email: user[0].email },
			'1h'
		);

		const emailValidationLink = generateEmailVerificationLink(
			emailValidationBaseUrl,
			emailValidationJwt
		);

		await sendEmailValidationEmail(
			email,
			user[0].first_name,
			user[0].last_name,
			emailValidationLink
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
