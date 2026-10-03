import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import { supabaseAdmin, supabaseAuth } from '../../../config/supabase';
import logger from '../../../config/logger';
import * as userRepository from '../../repositories/userRepository/userRepository';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import * as dressDamageIncidentRepository from '../../repositories/dressDamageIncidentRepository/dressDamageIncidentRepository';
import { deleteR2UrlsBestEffort } from '../../utils/cloudflare/cleanup';
import AppError from '../../utils/errors/appError';
import { User } from '../../resources/types';

/**
 * Delete user using Supabase Auth
 * Requires password confirmation for security
 * Deletes:
 * - User record from database, which cascades to dresses, their bookings and
 *   damage incidents, watchlist entries and an owned business
 * - All user images from Cloudflare R2 (profile, dress photos, damage incident
 *   photos), only after the database deletion has committed
 * - User from Supabase Auth
 * Requires valid JWT token (verified by supabaseAuthenticateReq middleware)
 */
async function deleteUserSupabase(req: Request, res: Response): Promise<void> {
	const { currentUserId, currentPassword } = req.body;

	logger.info(`Deleting user: ${currentUserId} (Supabase)`);

	// Verify the password before opening a transaction, so no pooled
	// connection is held across the Supabase network call.
	let user: User[];
	try {
		user = await userRepository.getUserById(currentUserId);
	} catch (error: any) {
		logger.error(`Failed to load user ${currentUserId} for deletion: ${error.message}`);
		throw new AppError(500, 'Unable to delete your account. Please try again later.');
	}

	if (user.length === 0) {
		throw new AppError(404, 'Account not found.');
	}

	let signInError: { message: string } | null;
	try {
		({ error: signInError } = await supabaseAuth.auth.signInWithPassword({
			email: user[0].email,
			password: currentPassword,
		}));
	} catch (error: any) {
		logger.error(`Password verification request failed for user ${currentUserId}: ${error.message}`);
		throw new AppError(500, 'Unable to delete your account. Please try again later.');
	}

	if (signInError) {
		logger.warn(
			`Password verification failed for user ${currentUserId}: ${signInError.message}`,
		);
		throw new AppError(403, 'Incorrect password. Please try again.');
	}

	logger.info(`Password verified for user ${currentUserId}`);

	// Collected inside the transaction, deleted from R2 only after COMMIT, so a
	// failed delete never leaves rows pointing at images that no longer exist.
	let imageUrlsToDelete: string[] = [];

	const connection = await getPool().connect();
	let releaseError: Error | undefined;

	try {
		await connection.query('BEGIN');

		const userInTransaction = await userRepository.getUserById(currentUserId, connection);
		if (userInTransaction.length === 0) {
			throw new AppError(404, 'Account not found.');
		}

		if (userInTransaction[0].profilePhotoUrl) {
			imageUrlsToDelete.push(userInTransaction[0].profilePhotoUrl);
		}

		const userVehicles = await dressRepository.getAllDressesByUserId(
			currentUserId,
			connection,
		);
		for (const vehicle of userVehicles) {
			if (vehicle.dressPhotoUrls?.length) {
				imageUrlsToDelete.push(...vehicle.dressPhotoUrls);
			}
		}

		const incidentPhotoUrls =
			await dressDamageIncidentRepository.getIncidentPhotoUrlsByDressOwner(
				currentUserId,
				connection,
			);
		imageUrlsToDelete.push(...incidentPhotoUrls);

		const deleteUserResult = await userRepository.deleteUserWithId(
			currentUserId,
			connection,
		);

		if (deleteUserResult.rowCount !== 1) {
			throw new AppError(404, 'Account not found.');
		}

		await connection.query('COMMIT');

		logger.info(`User ${currentUserId} deleted from database successfully`);
	} catch (error: any) {
		imageUrlsToDelete = [];

		try {
			await connection.query('ROLLBACK');
		} catch (rollbackError: any) {
			logger.error(`Failed to roll back user deletion: ${rollbackError.message}`);
			// Discard this client rather than return a broken one to the pool
			releaseError = rollbackError;
		}

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Failed to delete user ${currentUserId} from database: ${error.message}`);
		throw new AppError(500, 'Unable to delete your account. Please try again.');
	} finally {
		// Runs on every path: success, AppError (404) and unexpected errors.
		connection.release(releaseError);
	}

	await deleteR2UrlsBestEffort(imageUrlsToDelete, `images of deleted user ${currentUserId}`);

	let deleteError: { message: string } | null;
	try {
		({ error: deleteError } =
			await supabaseAdmin.auth.admin.deleteUser(currentUserId));
	} catch (error: any) {
		deleteError = { message: error?.message ?? 'Unknown error' };
	}

	if (deleteError) {
		logger.error(
			`Failed to delete user ${currentUserId} from Supabase: ${deleteError.message}`,
		);
		throw new AppError(
			500,
			'Your account data was partially deleted. Please contact support for assistance.',
		);
	}

	logger.info(`User ${currentUserId} deleted from Supabase successfully`);

	res.status(200).send({
		message: 'User deleted successfully',
	});
}

export default deleteUserSupabase;
