import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { supabaseAuth } from '../../../config/supabase';
import AppError from '../../utils/errors/appError';

async function forgotPasswordSupabase(
	req: Request,
	res: Response
): Promise<void> {
	const { email } = req.body;

	logger.info(
		`Processing forgot password request for user with email: ${email}`
	);

	try {
		if (!email) {
			throw new AppError(400, 'Please provide your email address.');
		}

		// Supabase handles password reset emails automatically
		// This will send a reset password email if the user exists
		// If the user doesn't exist, it will fail silently for security reasons
		const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
			redirectTo:
				process.env.PASSWORD_RESET_REDIRECT_URL ||
				`${process.env.FRONTEND_URL}/profile/reset-password`,
		});

		if (error) {
			logger.error(
				`Error sending password reset email: ${error.message}`
			);
			// Don't expose whether the user exists or not for security reasons
			// Return success message regardless
		}

		logger.info(`Password reset email sent successfully to: ${email}`);
		res.status(200).send({
			message:
				'If an account exists with this email, a password reset link has been sent',
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(
			`Unexpected error during forgot password: ${error.message}`
		);
		throw new AppError(500, 'Something went wrong. Please try again.');
	}
}

export default forgotPasswordSupabase;
