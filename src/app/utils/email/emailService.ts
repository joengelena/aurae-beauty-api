import { generateJwtToken } from '../jwt/generateJwt';
import nodemailerSendEmail from './nodemailer';
import getValidateEmailFormat from './getValidateEmailFormat';
import getForgotPasswordEmailFormat from './getForgotPasswordEmailFormat';

async function sendEmailVerificationLink(
	userId: string,
	email: string,
	webAppBaseUrl: string,
	urlPath: string
) {
	const emailVerificationJwt = generateJwtToken({ userId: userId }, '15m');

	const emailSubject = `${process.env.COMPANY_NAME} - Email Verification`;

	const htmlBody = getValidateEmailFormat(
		`${webAppBaseUrl}${urlPath}?token=${emailVerificationJwt}`
	);

	await nodemailerSendEmail(email, emailSubject, htmlBody);
}

async function sendResetPasswordLink(
	userId: string,
	email: string,
	oldHashedPassword: string,
	webAppBaseUrl: string,
	urlPath: string
) {
	const emailSubject = `${process.env.COMPANY_NAME} - Reset Password`;

	const resetPasswordJwt = generateJwtToken(
		{ userId: userId, something: oldHashedPassword },
		'15m'
	);

	const htmlBody = getForgotPasswordEmailFormat(
		`${webAppBaseUrl}${urlPath}?token=${resetPasswordJwt}`
	);

	await nodemailerSendEmail(email, emailSubject, htmlBody);
}

export { sendEmailVerificationLink, sendResetPasswordLink };
