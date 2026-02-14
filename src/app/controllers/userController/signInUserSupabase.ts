import { Request, Response } from 'express';
import { supabaseAuth } from '../../../config/supabase';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

/**
 * Sign in user using Supabase Auth
 * Supports both web (httpOnly cookies) and Flutter (token response) clients
 * - Web clients: tokens stored in httpOnly cookies
 * - Flutter clients: tokens returned in response body (set X-Client-Type: flutter header)
 */
async function signInUserSupabase(req: Request, res: Response): Promise<void> {
	const { email, password } = req.body;
	const clientType = req.headers['x-client-type']?.toString().toLowerCase();
	const isFlutterClient = clientType === 'flutter';

	logger.info(
		`Signing in user with email: ${email} (Supabase, client: ${
			clientType || 'web'
		})`
	);

	try {
		const { data, error } = await supabaseAuth.auth.signInWithPassword({
			email,
			password,
		});

		if (error || !data.user || !data.session) {
			logger.warn(
				`Failed to sign in user: ${
					error?.message || 'No session returned'
				}`
			);

			if (error?.message.includes('Email not confirmed')) {
				throw new AppError(
					403,
					'Please verify your email before signing in. Check your inbox for the verification link.'
				);
			}

			if (error?.message.includes('Invalid login credentials')) {
				throw new AppError(
					401,
					'Incorrect email or password. Please try again.'
				);
			}

			logger.error(
				`Error signing in user with email '${email}': ${error?.message}`
			);
			throw new AppError(
				500,
				'Unable to sign in right now. Please try again later.'
			);
		}

		logger.info(`User ${data.user.id} signed in successfully`);

		if (isFlutterClient) {
			res.status(200).send({
				message: 'Sign in successful',
				userId: data.user.id,
				email: data.user.email,
				accessToken: data.session.access_token,
				refreshToken: data.session.refresh_token,
				expiresIn: data.session.expires_in,
				expiresAt: data.session.expires_at,
			});
		} else {
			// Check if origin is allowed for cookie-based auth
			const allowedOrigins =
				process.env.ALLOWED_COOKIE_ORIGINS?.split(',').map((o) =>
					o.trim()
				) || [];
			const requestOrigin = req.headers.origin;
			const isOriginAllowed =
				!requestOrigin || allowedOrigins.includes(requestOrigin);

			if (!isOriginAllowed) {
				logger.warn(
					`Cookie authentication blocked for origin: ${requestOrigin}`
				);
				throw new AppError(
					403,
					'Cookie authentication not allowed from this origin'
				);
			}

			// Use secure cookies in production, allow HTTP in development
			const isProduction = process.env.NODE_ENV === 'production';

			res.cookie('sb-access-token', data.session.access_token, {
				httpOnly: true,
				secure: isProduction,
				maxAge: data.session.expires_in * 1000, // Convert to milliseconds
				sameSite: isProduction ? 'none' : 'lax',
			});

			res.cookie('sb-refresh-token', data.session.refresh_token, {
				httpOnly: true,
				secure: isProduction,
				maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
				sameSite: isProduction ? 'none' : 'lax',
			});

			res.status(200).send({
				message: 'Sign in successful',
				userId: data.user.id,
				email: data.user.email,
			});
		}
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during sign in: ${error.message}`);
		throw new AppError(500, 'Something went wrong. Please try again.');
	}
}

export default signInUserSupabase;
