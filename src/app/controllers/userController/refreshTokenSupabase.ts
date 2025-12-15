import { Request, Response } from 'express';
import { supabaseAuth } from '../../../config/supabase';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function refreshTokenSupabase(
	req: Request,
	res: Response
): Promise<void> {
	const clientType = req.headers['x-client-type']?.toString().toLowerCase();
	const isFlutterClient = clientType === 'flutter';

	logger.info(`Refreshing access token (client: ${clientType || 'web'})`);

	try {
		let refreshToken: string | undefined;

		if (isFlutterClient) {
			refreshToken = req.body.refreshToken;
		} else {
			refreshToken = req.cookies['sb-refresh-token'];
		}

		if (!refreshToken) {
			logger.warn('Refresh token not provided');
			throw new AppError(
				401,
				'Your session has expired. Please sign in again.'
			);
		}

		const { data, error } = await supabaseAuth.auth.refreshSession({
			refresh_token: refreshToken,
		});

		if (error || !data.session) {
			logger.warn(
				`Failed to refresh token: ${
					error?.message || 'No session returned'
				}`
			);
			throw new AppError(
				401,
				'Your session has expired. Please sign in again.'
			);
		}

		logger.info(
			`Access token refreshed successfully for user: ${data.user?.id}`
		);

		if (isFlutterClient) {
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
			res.cookie('sb-access-token', data.session.access_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: data.session.expires_in * 1000,
			});

			res.cookie('sb-refresh-token', data.session.refresh_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			});

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
		throw new AppError(500, 'Something went wrong. Please sign in again.');
	}
}

export default refreshTokenSupabase;
