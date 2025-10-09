import { Request, Response } from 'express';
import { supabaseAuth } from '../../../config/supabase';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

/**
 * Refresh access token using Supabase Auth
 * Supports both web (httpOnly cookies) and Flutter (token in body) clients
 * - Web clients: refresh token from httpOnly cookie
 * - Flutter clients: refresh token from request body (set X-Client-Type: flutter header)
 */
async function refreshTokenSupabase(req: Request, res: Response): Promise<void> {
	const clientType = req.headers['x-client-type']?.toString().toLowerCase();
	const isFlutterClient = clientType === 'flutter';

	logger.info(
		`Refreshing access token (client: ${clientType || 'web'})`
	);

	try {
		let refreshToken: string | undefined;

		if (isFlutterClient) {
			// For Flutter clients: get refresh token from request body
			refreshToken = req.body.refreshToken;
		} else {
			// For web clients: get refresh token from httpOnly cookie
			refreshToken = req.cookies['sb-refresh-token'];
		}

		if (!refreshToken) {
			logger.warn('Refresh token not provided');
			res.status(401).send({
				error: 'Unauthorized: No refresh token provided',
			});
			return;
		}

		// Refresh the session with Supabase
		const { data, error } = await supabaseAuth.auth.refreshSession({
			refresh_token: refreshToken,
		});

		if (error || !data.session) {
			logger.warn(
				`Failed to refresh token: ${
					error?.message || 'No session returned'
				}`
			);

			res.status(401).send({
				error: 'Unauthorized: Invalid or expired refresh token',
			});
			return;
		}

		logger.info(`Access token refreshed successfully for user: ${data.user?.id}`);

		if (isFlutterClient) {
			// For Flutter clients: return new tokens in response body
			res.status(200).send({
				message: 'Token refreshed successfully',
				userId: data.user?.id,
				email: data.user?.email,
				accessToken: data.session.access_token,
				refreshToken: data.session.refresh_token,
				expiresIn: data.session.expires_in,
				expiresAt: data.session.expires_at,
			});
		} else {
			// For web clients: update httpOnly cookies
			res.cookie('sb-access-token', data.session.access_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: data.session.expires_in * 1000, // Convert to milliseconds
			});

			res.cookie('sb-refresh-token', data.session.refresh_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			});

			// Return success message only (no tokens in response body)
			res.status(200).send({
				message: 'Token refreshed successfully',
				userId: data.user?.id,
				email: data.user?.email,
			});
		}
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during token refresh: ${error.message}`);
		throw new AppError(500, 'Internal Server Error');
	}
}

export default refreshTokenSupabase;
