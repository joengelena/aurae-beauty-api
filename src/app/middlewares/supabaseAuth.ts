import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import logger from '../../config/logger';

/**
 * Middleware to verify Supabase JWT token and authenticate requests.
 * Extracts user ID from token and attaches it to req.body.currentUserId
 */
async function supabaseAuth(req: Request, res: Response, next: NextFunction) {
	try {
		logger.info('Verifying Supabase JWT token');

		// Extract token from httpOnly cookie (primary) or Authorization header (fallback)
		let token = req.cookies['sb-access-token'];

		if (!token) {
			const authHeader = req.headers.authorization;
			if (authHeader && authHeader.startsWith('Bearer ')) {
				token = authHeader.split(' ')[1];
			}
		}

		if (!token) {
			res.status(401).send({
				error: 'Unauthorized: No authorization token provided',
			});
			return;
		}

		// Verify the JWT token with Supabase
		const {
			data: { user },
			error,
		} = await supabaseAdmin.auth.getUser(token);

		if (error || !user) {
			logger.warn(
				`Failed to verify Supabase token: ${error?.message || 'No user found'}`
			);
			res.status(401).send({
				error: 'Unauthorized: Invalid or expired token',
			});
			return;
		}

		// Attach user ID to request for downstream use
		req.body.currentUserId = user.id;

		logger.info(`User authenticated: ${user.id}`);
		next();
	} catch (error) {
		logger.error(`Error in Supabase auth middleware: ${error.message}`);
		res.status(500).send({
			error: 'Internal server error during authentication',
		});
		return;
	}
}

export default supabaseAuth;