import { generateJwtToken } from '../jwt/generateJwt';
import nodemailerSendEmail from './nodemailer';
import getValidateEmailFormat from './getValidateEmailFormat';
import getForgotPasswordEmailFormat from './getForgotPasswordEmailFormat';

async function sendEmailVerificationLink(
	userId: string,
	email: string,
	verificationLinkBaseUrl: string
) {
	const emailVerificationJwt = generateJwtToken({ userId: userId }, '1h');

	const emailSubject = `${process.env.COMPANY_NAME} - Email Verification`;

	const htmlBody = getValidateEmailFormat(
		`${verificationLinkBaseUrl}?token=${emailVerificationJwt}`
	);

	await nodemailerSendEmail(email, emailSubject, htmlBody);
}

async function sendResetPasswordLink(
	userId: string,
	email: string,
	oldHashedPassword: string,
	resetPasswordLink: string
) {
	const emailSubject = `${process.env.COMPANY_NAME} - Reset Password`;

	const resetPasswordJwt = generateJwtToken(
		{ userId: userId, something: oldHashedPassword },
		'1h'
	);

	const htmlBody = getForgotPasswordEmailFormat(
		`${resetPasswordLink}?token=${resetPasswordJwt}`
	);

	await nodemailerSendEmail(email, emailSubject, htmlBody);
}

export { sendEmailVerificationLink, sendResetPasswordLink };
