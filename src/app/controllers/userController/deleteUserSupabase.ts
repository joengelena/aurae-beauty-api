import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import { supabaseAdmin, supabaseAuth } from '../../../config/supabase';
import logger from '../../../config/logger';
import * as userRepository from '../../repositories/userRepository/userRepository';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import {
	extractKeyFromUrl,
	deleteMultipleFilesFromR2,
} from '../../utils/cloudflare/r2Client';
import AppError from '../../utils/errors/appError';

/**
 * Delete user using Supabase Auth
 * Requires password confirmation for security
 * Deletes:
 * - All user images from Cloudflare R2 (profile, listings, vehicles)
 * - User listings and listing photos from database (CASCADE)
 * - User vehicles and vehicle services from database (CASCADE)
 * - User watchlist entries from database (CASCADE)
 * - User record from database
 * - User from Supabase Auth
 * Requires valid JWT token (verified by supabaseAuthenticateReq middleware)
 */
async function deleteUserSupabase(req: Request, res: Response): Promise<void> {
	const { currentUserId, currentPassword } = req.body;

	logger.info(`Deleting user: ${currentUserId} (Supabase)`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		const user = await userRepository.getUserById(
			currentUserId,
			connection,
		);

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
				`Password verification failed for user ${currentUserId}: ${signInError.message}`,
			);
			throw new AppError(403, 'Incorrect password. Please try again.');
		}

		logger.info(`Password verified for user ${currentUserId}`);

		// Collect all image URLs to delete from R2
		const imageUrlsToDelete: string[] = [];

		try {
			// Get user's profile photo URL
			if (user[0].profilePhotoUrl) {
				imageUrlsToDelete.push(user[0].profilePhotoUrl);
			}

			// Get all user's listings and their images
			const userListings = await listingRepository.getAllListings({
				userIdFk: currentUserId,
				limit: '1000', // Get all listings (max 1000)
				pageNumber: '1',
			});

			for (const listing of userListings.data) {
				// Add all listing photos
				if (listing.imageUrls && Array.isArray(listing.imageUrls)) {
					imageUrlsToDelete.push(...listing.imageUrls);
				}
			}

			// Get all user's vehicles and their images
			const userVehicles = await vehicleRepository.getAllVehiclesByUserId(
				currentUserId,
				connection,
			);

			for (const vehicle of userVehicles) {
				if (vehicle.vehiclePhotoUrl) {
					imageUrlsToDelete.push(vehicle.vehiclePhotoUrl);
				}
			}

			// Extract R2 keys from URLs and delete from R2
			const r2Keys = imageUrlsToDelete
				.map((url) => extractKeyFromUrl(url))
				.filter((key): key is string => key !== null);

			if (r2Keys.length > 0) {
				logger.info(
					`Deleting ${r2Keys.length} images from R2 for user ${currentUserId}`,
				);
				await deleteMultipleFilesFromR2(r2Keys);
				logger.info(
					`Successfully deleted ${r2Keys.length} images from R2`,
				);
			} else {
				logger.info('No images to delete from R2');
			}
		} catch (r2Error: any) {
			// Log error but don't fail the deletion - we want to delete the database records anyway
			logger.error(
				`Error deleting images from R2: ${r2Error.message}. Continuing with database deletion.`,
			);
		}

		try {
			const deleteUserResult = await userRepository.deleteUserWithId(
				currentUserId,
				connection,
			);

			if (deleteUserResult.rowCount !== 1) {
				throw new AppError(404, 'Account not found.');
			}

			await connection.query('COMMIT');
			connection.release();

			logger.info(
				`User ${currentUserId} deleted from MySQL database successfully`,
			);
		} catch (dbError: any) {
			await connection.query('ROLLBACK');
			connection.release();

			logger.error(
				`Failed to delete user from MySQL: ${dbError.message}`,
			);
			throw new AppError(
				500,
				'Unable to delete your account. Please try again.',
			);
		}

		const { error: deleteError } =
			await supabaseAdmin.auth.admin.deleteUser(currentUserId);

		if (deleteError) {
			logger.error(
				`Failed to delete user from Supabase: ${deleteError.message}`,
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
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during user deletion: ${error.message}`);
		throw new AppError(
			500,
			'Unable to delete your account. Please try again later.',
		);
	}
}

export default deleteUserSupabase;
