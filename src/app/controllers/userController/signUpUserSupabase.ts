import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import { supabaseAdmin } from '../../../config/supabase';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { FALSE } from '../../resources/constants';

async function signUpUserSupabase(req: Request, res: Response): Promise<void> {
	const { firstName, lastName, email, password, phoneNumber } =
		req.body;

	logger.info(`Signing up new user with email: ${email} (Supabase)`);

	try {
		const { data: authData, error: authError } =
			await supabaseAdmin.auth.admin.createUser({
				email,
				password,
				email_confirm: true, // Auto-confirm email (set to false if you want to require email verification)
				user_metadata: {
					firstName,
					lastName,
					phoneNumber,
				},
			});

		if (authError || !authData.user) {
			logger.error(
				`Failed to create user in Supabase: ${authError?.message}`
			);
			logger.error(`Full Supabase error: ${JSON.stringify(authError)}`);

			if (authError?.message.includes('already registered')) {
				throw new AppError(
					409,
					'This email is already registered. Please sign in or use a different email.'
				);
			}

			if (authError?.message.includes('not allowed')) {
				throw new AppError(
					503,
					'Account registration is temporarily unavailable. Please try again later.'
				);
			}

			throw new AppError(
				500,
				'Unable to create your account. Please try again later.'
			);
		}

		const supabaseUserId = authData.user.id;
		logger.info(
			`User created in Supabase with ID: ${supabaseUserId}, syncing to MySQL`
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
					isEmailVerified: FALSE,
					isPhoneNumberVerified: FALSE,
				},
				connection
			);

			await connection.query('COMMIT');
			connection.release();

			logger.info(
				`User ${supabaseUserId} successfully synced to MySQL database`
			);
		} catch (dbError) {
			await connection.query('ROLLBACK');
			connection.release();

			logger.error(
				`Failed to sync user to MySQL: ${dbError.message}, rolling back Supabase user`
			);

			await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);

			if (dbError.code === 'ER_DUP_ENTRY') {
				const splitErrorMessage = dbError.sqlMessage.split(' ');
				const lastWordInErrorMessage =
					splitErrorMessage[splitErrorMessage.length - 1];

				if (lastWordInErrorMessage.includes('phone_number')) {
					throw new AppError(
						409,
						'This phone number is already registered. Please use a different one.'
					);
				}

				throw new AppError(
					409,
					'An account with these details already exists.'
				);
			}

			throw new AppError(
				500,
				'Unable to complete your registration. Please try again.'
			);
		}

		res.status(201).send({
			message: 'User created successfully',
			userId: supabaseUserId,
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during signup: ${error.message}`);
		throw new AppError(500, 'Something went wrong. Please try again.');
	}
}

export default signUpUserSupabase;
