import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import { supabaseAdmin, supabaseAuth } from '../../../config/supabase';
import logger from '../../../config/logger';
import * as userRepository from '../../repositories/userRepository/userRepository';
import AppError from '../../utils/errors/appError';

/**
 * Delete user using Supabase Auth
 * Requires password confirmation for security
 * Deletes from both Supabase Auth and MySQL database
 * Requires valid JWT token (verified by supabaseAuthenticateReq middleware)
 */
async function deleteUserSupabase(req: Request, res: Response): Promise<void> {
	const { currentUserId, currentPassword } = req.body;

	logger.info(`Deleting user: ${currentUserId} (Supabase)`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		const user = await userRepository.getUserById(currentUserId, connection);

		if (user.length === 0) {
			throw new AppError(404, 'Account not found.');
		}

		const { error: signInError } =
			await supabaseAuth.auth.signInWithPassword({
				email: user[0].email,
				password: currentPassword,
			});

		if (signInError) {
			logger.warn(
				`Password verification failed for user ${currentUserId}: ${signInError.message}`
			);
			throw new AppError(403, 'Incorrect password. Please try again.');
		}

		logger.info(`Password verified for user ${currentUserId}`);

		try {
			const deleteUserResult = await userRepository.deleteUserWithId(
				currentUserId,
				connection
			);

			if (deleteUserResult.rowCount !== 1) {
				throw new AppError(404, 'Account not found.');
			}

			await connection.query('COMMIT');
			connection.release();

			logger.info(
				`User ${currentUserId} deleted from MySQL database successfully`
			);
		} catch (dbError) {
			await connection.query('ROLLBACK');
			connection.release();

			logger.error(
				`Failed to delete user from MySQL: ${dbError.message}`
			);
			throw new AppError(500, 'Unable to delete your account. Please try again.');
		}

		const { error: deleteError } =
			await supabaseAdmin.auth.admin.deleteUser(currentUserId);

		if (deleteError) {
			logger.error(
				`Failed to delete user from Supabase: ${deleteError.message}`
			);
			throw new AppError(
				500,
				'Your account data was partially deleted. Please contact support for assistance.'
			);
		}

		logger.info(`User ${currentUserId} deleted from Supabase successfully`);

		res.status(200).send({
			message: 'User deleted successfully',
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during user deletion: ${error.message}`);
		throw new AppError(500, 'Unable to delete your account. Please try again later.');
	}
}

export default deleteUserSupabase;
