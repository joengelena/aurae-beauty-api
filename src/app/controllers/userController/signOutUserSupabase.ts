import { Request, Response } from 'express';
import { supabaseAdmin } from '../../../config/supabase';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

/**
 * Sign out user using Supabase Auth
 * Requires valid JWT token in Authorization header (verified by supabaseAuth middleware)
 */
async function signOutUserSupabase(
	req: Request,
	res: Response
): Promise<void> {
	const userId = req.body.currentUserId; // Set by supabaseAuth middleware

	logger.info(`Signing out user: ${userId} (Supabase)`);

	try {
		// Sign out user (invalidates all sessions for this user)
		const { error } = await supabaseAdmin.auth.admin.signOut(userId);

		if (error) {
			logger.error(`Failed to sign out user: ${error.message}`);
			throw new AppError(500, `Sign out failed: ${error.message}`);
		}

		logger.info(`User ${userId} signed out successfully`);

		// Clear httpOnly cookies
		res.clearCookie('sb-access-token', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
		});

		res.clearCookie('sb-refresh-token', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
		});

		res.status(200).send({
			message: 'Sign out successful',
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during sign out: ${error.message}`);
		throw new AppError(500, 'Internal Server Error');
	}
}

export default signOutUserSupabase;