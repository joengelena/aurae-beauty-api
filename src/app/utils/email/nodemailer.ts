import nodemailer from 'nodemailer';
import logger from '../../../config/logger';
import getValidateEmailFormat from './validateEmailFormat';

const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: process.env.EMAIL,
		pass: process.env.EMAIL_PASSWORD,
	},
});

async function sendEmailValidationEmail(
	emailTo: string,
	firstName: string,
	lastName: string,
	verificationLink: string
) {
	const mailOptions = {
		from: process.env.EMAIL,
		to: emailTo,
		subject: `${process.env.COMPANY_NAME} - Email Validation`,
		html: getValidateEmailFormat(firstName, lastName, verificationLink),
	};

	try {
		logger.info('Sending email');
		await transporter.sendMail(mailOptions);
		logger.info('Email sent successfully');
	} catch (error) {
		logger.debug(error);
		throw Error(`Error sending email: ${error.message}`);
	}
}

export default sendEmailValidationEmail;
