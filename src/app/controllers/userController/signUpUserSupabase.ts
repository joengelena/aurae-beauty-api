import { Request, Response } from 'express';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { getPool } from '../../../config/db';
import { supabaseAdmin } from '../../../config/supabase';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { FALSE } from '../../resources/constants';

const EMAIL_ALREADY_REGISTERED =
	'This email is already registered. Please sign in or use a different email.';

// Tolerance for clock skew between this server and Supabase when deciding
// whether a Supabase user was created by this request.
const CREATED_AT_SKEW_MS = 60 * 1000;

/**
 * signUp() does not always create a user. For an email that already exists
 * but is unconfirmed it re-sends the confirmation email and returns the
 * EXISTING user (same id); with email-enumeration protection on, a confirmed
 * email returns an obfuscated user with no identities. Only a user that was
 * created by this call may ever be deleted when the Postgres sync fails.
 */
function wasCreatedByThisRequest(user: SupabaseUser, requestStartedAt: number): boolean {
	if (!user.identities || user.identities.length === 0) {
		return false;
	}

	const createdAt = Date.parse(user.created_at);
	if (isNaN(createdAt)) {
		return false;
	}

	return createdAt >= requestStartedAt - CREATED_AT_SKEW_MS;
}

async function signUpUserSupabase(req: Request, res: Response): Promise<void> {
	const { firstName, lastName, email, password, phoneNumber, location } =
		req.body;

	logger.info(`Signing up new user with email: ${email} (Supabase)`);

	try {
		// Primary guard: an email that already has an account in Postgres never
		// reaches Supabase, so signUp can't hand back an existing user's id.
		const existingUserId = await userRepository.getUserIdByEmail(email);
		if (existingUserId) {
			throw new AppError(409, EMAIL_ALREADY_REGISTERED);
		}

		const requestStartedAt = Date.now();

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
					emailRedirectTo: process.env.EMAIL_VERIFICATION_REDIRECT_URL,
				},
			});

		if (authError || !authData.user) {
			logger.error(
				`Failed to create user in Supabase: ${authError?.message}`,
			);
			logger.error(`Full Supabase error: ${JSON.stringify(authError)}`);

			if (authError?.message.includes('already registered')) {
				throw new AppError(409, EMAIL_ALREADY_REGISTERED);
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
		const createdByThisRequest = wasCreatedByThisRequest(
			authData.user,
			requestStartedAt,
		);

		// An obfuscated / pre-existing Supabase account: nothing to sync, and
		// nothing of ours to roll back.
		if (!authData.user.identities || authData.user.identities.length === 0) {
			logger.warn(
				`Signup for an email that already exists in Supabase (returned user ${supabaseUserId})`,
			);
			throw new AppError(409, EMAIL_ALREADY_REGISTERED);
		}

		logger.info(
			`Supabase signUp returned user ${supabaseUserId} (created by this request: ${createdByThisRequest}), syncing to database...`,
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
					instagram: null,
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
			await connection.query('ROLLBACK').catch((rollbackError: any) => {
				logger.error(`Failed to roll back user sync: ${rollbackError.message}`);
			});
			connection.release();

			logger.error(
				`Failed to sync user ${supabaseUserId} to database: ${dbError.message}`,
			);

			await rollbackSupabaseUserIfOurs(supabaseUserId, createdByThisRequest);

			if (dbError.code === '23505') {
				const constraint = (dbError.constraint as string) ?? '';

				if (constraint.includes('phone_number')) {
					throw new AppError(
						409,
						'This phone number is already registered. Please use a different one.',
					);
				}

				throw new AppError(409, EMAIL_ALREADY_REGISTERED);
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

/**
 * Deletes the Supabase user after a failed Postgres sync, but only when this
 * request created it AND no Postgres row already uses that id (a concurrent
 * signup for the same email may have synced it in the meantime). Deleting in
 * any other case would destroy someone's existing account.
 */
async function rollbackSupabaseUserIfOurs(
	supabaseUserId: string,
	createdByThisRequest: boolean,
): Promise<void> {
	if (!createdByThisRequest) {
		logger.warn(
			`Not deleting Supabase user ${supabaseUserId}: it existed before this signup request`,
		);
		return;
	}

	try {
		const existingRows = await userRepository.getUserById(supabaseUserId);
		if (existingRows.length > 0) {
			logger.warn(
				`Not deleting Supabase user ${supabaseUserId}: a database row with this id already exists`,
			);
			return;
		}

		const { error } = await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
		if (error) {
			logger.error(
				`Failed to roll back Supabase user ${supabaseUserId}: ${error.message}`,
			);
			return;
		}

		logger.info(`Rolled back Supabase user ${supabaseUserId}`);
	} catch (error: any) {
		logger.error(
			`Failed to roll back Supabase user ${supabaseUserId}: ${error.message}`,
		);
	}
}

export default signUpUserSupabase;
