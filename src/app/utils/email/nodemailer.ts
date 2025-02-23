import nodemailer from 'nodemailer';
import logger from '../../../config/logger';
import getValidateEmailFormat from './getValidateEmailFormat';
import NodeMailerError from '../errors/NodeMailerError';

const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: process.env.EMAIL,
		pass: process.env.EMAIL_PASSWORD,
	},
});

async function nodemailerSendEmail(
	to: string,
	subject: string,
	htmlBody: string
) {
	const mailOptions = {
		from: process.env.EMAIL,
		to: to,
		subject: subject,
		html: htmlBody,
	};

	try {
		logger.info('Sending email');
		await transporter.sendMail(mailOptions);
		logger.info('Email sent successfully');
	} catch (error) {
		logger.error(error);
		throw new NodeMailerError(`Error sending email: ${error.message}`);
	}
}

export default nodemailerSendEmail;
