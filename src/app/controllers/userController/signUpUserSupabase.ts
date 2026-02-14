import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import { supabaseAdmin } from '../../../config/supabase';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { FALSE } from '../../resources/constants';

async function signUpUserSupabase(req: Request, res: Response): Promise<void> {
	const { firstName, lastName, email, password, phoneNumber, location } =
		req.body;

	logger.info(`Signing up new user with email: ${email} (Supabase)`);

	try {
		// Use signUp instead of admin.createUser to trigger email confirmation
		const { data: authData, error: authError } =
			await supabaseAdmin.auth.signUp({
				email,
				password,
				options: {
					data: {
						firstName,
						lastName,
						phoneNumber,
						location,
					},
					emailRedirectTo: undefined, // Let Supabase use default redirect URL
				},
			});

		if (authError || !authData.user) {
			logger.error(
				`Failed to create user in Supabase: ${authError?.message}`,
			);
			logger.error(`Full Supabase error: ${JSON.stringify(authError)}`);

			if (authError?.message.includes('already registered')) {
				throw new AppError(
					409,
					'This email is already registered. Please sign in or use a different email.',
				);
			}

			if (authError?.message.includes('not allowed')) {
				throw new AppError(
					503,
					'Account registration is temporarily unavailable. Please try again later.',
				);
			}

			throw new AppError(
				500,
				'Unable to create your account. Please try again later.',
			);
		}

		const supabaseUserId = authData.user.id;
		logger.info(
			`User created in Supabase with ID: ${supabaseUserId}, syncing to database...`,
		);

		const connection = await getPool().connect();

		try {
			await connection.query('BEGIN');

			await userRepository.signUpUser(
				{
					id: supabaseUserId,
					firstName,
					lastName,
					email,
					phoneNumber,
					location,
					profilePhotoUrl: null,
					isEmailVerified: FALSE,
					isPhoneNumberVerified: FALSE,
				},
				connection,
			);

			await connection.query('COMMIT');
			connection.release();

			logger.info(
				`User ${supabaseUserId} successfully synced to database`,
			);
		} catch (dbError: any) {
			await connection.query('ROLLBACK');
			connection.release();

			logger.error(
				`Failed to sync user to database: ${dbError.message}, rolling back Supabase user`,
			);

			await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);

			if (dbError.code === 'ER_DUP_ENTRY') {
				const splitErrorMessage = dbError.sqlMessage.split(' ');
				const lastWordInErrorMessage =
					splitErrorMessage[splitErrorMessage.length - 1];

				if (lastWordInErrorMessage.includes('phone_number')) {
					throw new AppError(
						409,
						'This phone number is already registered. Please use a different one.',
					);
				}

				throw new AppError(
					409,
					'An account with these details already exists.',
				);
			}

			throw new AppError(
				500,
				'Unable to complete your registration. Please try again.',
			);
		}

		res.status(201).send({
			message:
				'Account created successfully. Please check your email to verify your account before signing in.',
		});
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during signup: ${error.message}`);
		throw new AppError(500, 'Something went wrong. Please try again.');
	}
}

export default signUpUserSupabase;
