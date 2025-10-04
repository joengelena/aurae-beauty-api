import { Request, Response } from 'express';
import { supabaseAdmin } from '../../../config/supabase';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { FALSE } from '../../resources/constants';

/**
 * Sign up a new user using Supabase Auth
 * Creates user in Supabase, then syncs minimal data to MySQL
 */
async function signUpUserSupabase(req: Request, res: Response): Promise<void> {
	const { firstName, lastName, username, email, password, phoneNumber } =
		req.body;

	logger.info(`Signing up new user with email: ${email} (Supabase)`);

	try {
		// Step 1: Create user in Supabase Auth
		const { data: authData, error: authError } =
			await supabaseAdmin.auth.admin.createUser({
				email,
				password,
				email_confirm: true, // Auto-confirm email (set to false if you want to require email verification)
				user_metadata: {
					firstName,
					lastName,
					username,
					phoneNumber,
				},
			});

		if (authError || !authData.user) {
			logger.error(
				`Failed to create user in Supabase: ${authError?.message}`
			);
			logger.error(`Full Supabase error: ${JSON.stringify(authError)}`);

			// Handle common errors
			if (authError?.message.includes('already registered')) {
				throw new AppError(403, 'Forbidden. Email already in use');
			}

			if (authError?.message.includes('not allowed')) {
				throw new AppError(
					403,
					'User registration is disabled in Supabase. Please enable "Email Signups" in Supabase Dashboard → Authentication → Settings'
				);
			}

			throw new AppError(
				500,
				`Failed to create user: ${authError?.message}`
			);
		}

		const supabaseUserId = authData.user.id;
		logger.info(
			`User created in Supabase with ID: ${supabaseUserId}, syncing to MySQL`
		);

		// Step 2: Sync user data to MySQL for additional fields
		try {
			await userRepository.signUpUser({
				id: supabaseUserId,
				firstName,
				lastName,
				username,
				email,
				password: '', // Password is managed by Supabase, not stored in MySQL
				phoneNumber,
				isEmailVerified: FALSE,
				isPhoneNumberVerified: FALSE,
			});

			logger.info(
				`User ${supabaseUserId} successfully synced to MySQL database`
			);
		} catch (dbError) {
			// If MySQL insert fails, clean up Supabase user
			logger.error(
				`Failed to sync user to MySQL: ${dbError.message}, rolling back Supabase user`
			);

			await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);

			if (dbError.code === 'ER_DUP_ENTRY') {
				const splitErrorMessage = dbError.sqlMessage.split(' ');
				const lastWordInErrorMessage =
					splitErrorMessage[splitErrorMessage.length - 1];

				if (lastWordInErrorMessage.includes('username')) {
					throw new AppError(403, 'Forbidden. Username already in use');
				}

				if (lastWordInErrorMessage.includes('phone_number')) {
					throw new AppError(
						403,
						'Forbidden. Phone number already in use'
					);
				}

				throw new AppError(403, 'Forbidden. Duplicate entry');
			}

			throw new AppError(500, 'Failed to complete user registration');
		}

		// Step 3: Return success response
		res.status(201).send({
			message: 'User created successfully',
			userId: supabaseUserId,
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during signup: ${error.message}`);
		throw new AppError(500, 'Internal Server Error');
	}
}

export default signUpUserSupabase;