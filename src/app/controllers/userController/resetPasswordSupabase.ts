import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { supabaseAdmin } from '../../../config/supabase';
import AppError from '../../utils/errors/appError';

/**
 * Reset password using the token from email link
 * Token is sent in Authorization header from the password reset email
 */
async function resetPasswordSupabase(
	req: Request,
	res: Response
): Promise<void> {
	const { newPassword } = req.body;

	logger.info('Processing password reset request from email link');

	try {
		if (!newPassword) {
			throw new AppError(400, 'Please provide a new password.');
		}

		// Extract token from Authorization header
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new AppError(
				401,
				'Invalid reset link. Please request a new password reset.'
			);
		}

		const token = authHeader.split(' ')[1];

		// Verify the JWT token with Supabase
		const {
			data: { user },
			error: verifyError,
		} = await supabaseAdmin.auth.getUser(token);

		if (verifyError || !user) {
			logger.warn(
				`Failed to verify reset token: ${
					verifyError?.message || 'No user found'
				}`
			);
			throw new AppError(
				401,
				'Invalid or expired reset link. Please request a new password reset.'
			);
		}

		// Update the user's password
		const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
			user.id,
			{ password: newPassword }
		);

		if (updateError) {
			logger.error(
				`Error resetting password for user ${user.id}: ${updateError.message}`
			);
			throw new AppError(
				500,
				'Unable to reset your password. Please try again.'
			);
		}

		logger.info(`Password reset successfully for user: ${user.id}`);
		res.status(200).send({
			message: 'Password reset successfully. You can now sign in with your new password.',
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during password reset: ${error.message}`);
		throw new AppError(
			500,
			'Something went wrong. Please try again or request a new reset link.'
		);
	}
}

export default resetPasswordSupabase;
