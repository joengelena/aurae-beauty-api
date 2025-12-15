import { Request, Response } from 'express';
import { supabaseAdmin } from '../../../config/supabase';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

/**
 * Sign out user using Supabase Auth
 * Supports both web (cookie clearing) and Flutter (token invalidation) clients
 * - Web clients: clears httpOnly cookies
 * - Flutter clients: invalidates session (set X-Client-Type: flutter header)
 * Requires valid JWT token in Authorization header (verified by supabaseAuth middleware)
 */
async function signOutUserSupabase(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId; // Set by supabaseAuth middleware
	const clientType = req.headers['x-client-type']?.toString().toLowerCase();
	const isFlutterClient = clientType === 'flutter';

	let token = req.cookies['sb-access-token'];

	if (!token) {
		const authHeader = req.headers.authorization;
		if (authHeader && authHeader.startsWith('Bearer ')) {
			token = authHeader.split(' ')[1];
		}
	}

	logger.info(
		`Signing out user: ${userId} (Supabase, client: ${clientType || 'web'})`
	);

	try {
		const { error } = await supabaseAdmin.auth.admin.signOut(token);

		if (error) {
			logger.error(`Failed to sign out user: ${error.message}`);
			throw new AppError(500, 'Unable to sign out. Please try again.');
		}

		logger.info(`User ${userId} signed out successfully`);

		if (!isFlutterClient) {
			// Check if origin is allowed for cookie-based auth
			const allowedOrigins =
				process.env.ALLOWED_COOKIE_ORIGINS?.split(',').map((o) =>
					o.trim()
				) || [];
			const requestOrigin = req.headers.origin;
			const isOriginAllowed =
				!requestOrigin || allowedOrigins.includes(requestOrigin);

			if (isOriginAllowed) {
				res.clearCookie('sb-access-token', {
					httpOnly: true,
					secure: true,
					sameSite: 'none',
				});

				res.clearCookie('sb-refresh-token', {
					httpOnly: true,
					secure: true,
					sameSite: 'none',
				});
			}
		}

		res.status(200).send({
			message: 'Sign out successful',
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during sign out: ${error.message}`);
		throw new AppError(500, 'Something went wrong. Please try again.');
	}
}

export default signOutUserSupabase;
