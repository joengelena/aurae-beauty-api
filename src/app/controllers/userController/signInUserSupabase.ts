import { Request, Response } from 'express';
import { supabaseAuth } from '../../../config/supabase';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

/**
 * Sign in user using Supabase Auth
 * Stores tokens in httpOnly cookies for security
 */
async function signInUserSupabase(req: Request, res: Response): Promise<void> {
	const { email, password } = req.body;

	logger.info(`Signing in user with email: ${email} (Supabase)`);

	try {
		// Sign in with Supabase using auth client (anon key)
		const { data, error } = await supabaseAuth.auth.signInWithPassword({
			email,
			password,
		});

		if (error || !data.user || !data.session) {
			logger.warn(
				`Failed to sign in user: ${error?.message || 'No session returned'}`
			);

			// Handle common errors
			if (
				error?.message.includes('Invalid login credentials') ||
				error?.message.includes('Email not confirmed')
			) {
				res.status(403).send({
					error: 'Invalid credentials. Please check your email and password.',
				});
				return;
			}

			throw new AppError(
				500,
				`Sign in failed: ${error?.message || 'Unknown error'}`
			);
		}

		logger.info(`User ${data.user.id} signed in successfully`);

		// Store tokens in httpOnly cookies for security
		res.cookie('sb-access-token', data.session.access_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: data.session.expires_in * 1000, // Convert to milliseconds
		});

		res.cookie('sb-refresh-token', data.session.refresh_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		});

		// Return user info only (no tokens in response body)
		res.status(200).send({
			message: 'Sign in successful',
			userId: data.user.id,
			email: data.user.email,
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during sign in: ${error.message}`);
		throw new AppError(500, 'Internal Server Error');
	}
}

export default signInUserSupabase;