import generateEmailVerificationLink from '../generateEmailVerificationLink';
import { generateJwtToken } from '../jwt/generateJwt';
import nodemailerSendEmail from './nodemailer';
import getValidateEmailFormat from './validateEmailFormat';

async function sendEmailVerificationLink(
	userId: string,
	email: string,
	verificationLinkBaseUrl: string
) {
	const emailVerificationJwt = generateJwtToken({ userId: userId }, '1h');

	const emailVerificationink = generateEmailVerificationLink(
		verificationLinkBaseUrl,
		emailVerificationJwt
	);

	const emailSubject = `${process.env.COMPANY_NAME} - Email Verification`;

	const htmlBody = getValidateEmailFormat(emailVerificationink);

	await nodemailerSendEmail(email, emailSubject, htmlBody);
}

export { sendEmailVerificationLink };
