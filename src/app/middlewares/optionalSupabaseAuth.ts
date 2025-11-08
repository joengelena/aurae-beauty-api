import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import logger from '../../config/logger';

/**
 * Optional Supabase authentication middleware
 * Attempts to extract user ID from token if present, but doesn't fail if missing
 */
async function optionalSupabaseAuth(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		logger.info('Optional auth middleware called');

		// Extract token from httpOnly cookie (primary) or Authorization header (fallback)
		let token = req.cookies['sb-access-token'];

		if (!token) {
			const authHeader = req.headers.authorization;
			if (authHeader && authHeader.startsWith('Bearer ')) {
				token = authHeader.split(' ')[1];
			}
		}

		// If no token, just continue without setting userId
		if (!token) {
			logger.info('Optional auth: No token found, continuing without auth');
			next();
			return;
		}

		// Verify the JWT token with Supabase
		const {
			data: { user },
			error,
		} = await supabaseAdmin.auth.getUser(token);

		if (!error && user) {
			// Attach user ID to request body for downstream use
			req.body.currentUserId = user.id;
			logger.info(`Optional auth: User ${user.id} authenticated`);
		} else {
			logger.info(`Optional auth: Token verification failed - ${error?.message}`);
		}

		next();
	} catch (error) {
		// On error, just continue without authentication
		logger.warn(`Optional auth error: ${error.message}`);
		next();
	}
}

export default optionalSupabaseAuth;
