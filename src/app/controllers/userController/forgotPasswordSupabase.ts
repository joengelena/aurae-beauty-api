import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { supabaseAuth } from '../../../config/supabase';

async function forgotPasswordSupabase(req: Request, res: Response) {
	try {
		logger.info(
			'Processing forgot password request for user with email: ' +
				req.body.email
		);

		const { email } = req.body;

		if (!email) {
			res.status(400).send('Email is required');
			return;
		}

		// Supabase handles password reset emails automatically
		// This will send a reset password email if the user exists
		// If the user doesn't exist, it will fail silently for security reasons
		const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
			redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL ||
				`${process.env.FRONTEND_URL}/reset-password`,
		});

		if (error) {
			logger.error(`Error sending password reset email: ${error.message}`);

			// Don't expose whether the user exists or not for security reasons
			// Return success message regardless
			res.status(200).send('If an account exists with this email, a password reset link has been sent');
			return;
		}

		logger.info(`Password reset email sent successfully to: ${email}`);
		res.status(200).send('If an account exists with this email, a password reset link has been sent');
		return;
	} catch (error) {
		logger.error(`Error processing forgot password request: ${error}`);
		res.status(500).send('Internal server error');
		return;
	}
}

export default forgotPasswordSupabase;
