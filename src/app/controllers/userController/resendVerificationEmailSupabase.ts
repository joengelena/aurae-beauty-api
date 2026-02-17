import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { supabaseAdmin } from '../../../config/supabase';
import AppError from '../../utils/errors/appError';

async function resendVerificationEmailSupabase(
	req: Request,
	res: Response,
): Promise<void> {
	const { email } = req.body;

	logger.info(`Processing resend verification email request for: ${email}`);

	try {
		const { error } = await supabaseAdmin.auth.resend({
			type: 'signup',
			email,
			options: {
				emailRedirectTo: process.env.EMAIL_VERIFICATION_REDIRECT_URL,
			},
		});

		if (error) {
			logger.error(
				`Error resending verification email to ${email}: ${error.message}`,
			);
		}

		// Return success regardless of whether the account exists or is already
		// verified to avoid exposing account information
		logger.info(`Resend verification email request processed for: ${email}`);
		res.status(200).send({
			message:
				'If an unverified account exists with this email, a new verification link has been sent.',
		});
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(
			`Unexpected error resending verification email: ${error.message}`,
		);
		throw new AppError(500, 'Something went wrong. Please try again.');
	}
}

export default resendVerificationEmailSupabase;
