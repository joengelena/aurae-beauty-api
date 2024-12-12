import nodemailer from 'nodemailer';
import logger from '../../../config/logger';

const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: process.env.EMAIL,
		pass: process.env.EMAIL_PASSWORD,
	},
});

async function sendEmail(emailTo: string) {
	const mailOptions = {
		from: process.env.EMAIL,
		to: emailTo,
		subject: 'Nodemailer - Test Email',
		text: 'This is a test email sent using Nodemailer.',
		html: '<b>This is a test email sent using Nodemailer.</b>',
	};

	try {
		logger.info('Sending email');
		await transporter.sendMail(mailOptions);
		logger.info('Email sent successfully');
	} catch (error) {
		throw Error(`Error sending email: ${error.message}`);
	}
}

export default sendEmail;
