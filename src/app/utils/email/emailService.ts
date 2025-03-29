import { generateJwtToken } from '../jwt/generateJwt';
import nodemailerSendEmail from './nodemailer';
import getValidateEmailFormat from './getValidateEmailFormat';
import getForgotPasswordEmailFormat from './getForgotPasswordEmailFormat';
import * as appConfigRepository from '../../repositories/appConfigurationRepository/appConfigurationRepository';

async function sendEmailVerificationLink(userId: string, email: string) {
	const appConfig = await appConfigRepository.getAppConfig();

	const webAppBaseUrl = appConfig.find(
		(config) => config.name === 'webAppBaseUrl'
	).value;

	const verifyEmailUrlPath = appConfig.find(
		(config) => config.name === 'verifyEmailUrlPath'
	).value;

	const emailVerificationJwt = generateJwtToken({ userId: userId }, '15m');

	const emailSubject = `${process.env.COMPANY_NAME} - Email Verification`;

	const htmlBody = getValidateEmailFormat(
		`${webAppBaseUrl}${verifyEmailUrlPath}?token=${emailVerificationJwt}`
	);

	await nodemailerSendEmail(email, emailSubject, htmlBody);
}

async function sendResetPasswordLink(userId: string, email: string) {
	const appConfig = await appConfigRepository.getAppConfig();

	const webAppBaseUrl = appConfig.find(
		(config) => config.name === 'webAppBaseUrl'
	).value;

	const resetPasswordUrlPath = appConfig.find(
		(config) => config.name === 'resetPasswordUrlPath'
	).value;

	const emailSubject = `${process.env.COMPANY_NAME} - Reset Password`;

	const resetPasswordJwt = generateJwtToken({ userId: userId }, '15m');

	const htmlBody = getForgotPasswordEmailFormat(
		`${webAppBaseUrl}${resetPasswordUrlPath}?token=${resetPasswordJwt}`
	);

	await nodemailerSendEmail(email, emailSubject, htmlBody);
}

export { sendEmailVerificationLink, sendResetPasswordLink };
