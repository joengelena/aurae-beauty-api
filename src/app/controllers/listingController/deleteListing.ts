import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import AppError from '../../utils/errors/appError';
import {
	extractKeyFromUrl,
	deleteMultipleFilesFromR2,
} from '../../utils/cloudflare/r2Client';

async function deleteListing(req: Request, res: Response): Promise<void> {
	const listingId = req.params.id;
	const currentUserId = req.body.currentUserId;

	logger.info(`Deleting listing with id '${listingId}'`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		const listing = await listingRepository.getListingById(
			listingId,
			connection
		);

		if (listing.length === 0) {
			throw new AppError(404, 'This listing is no longer available.');
		}

		if (currentUserId !== listing[0].userIdFk) {
			throw new AppError(403, 'You can only delete your own listings.');
		}

		// Extract image URLs before deletion
		const imageUrls = listing[0].imageUrls;
		logger.info(`Found ${imageUrls.length} image(s) to delete from R2`);

		const deleteListingResult = await listingRepository.deleteListingWithId(
			listingId,
			connection
		);

		if (deleteListingResult.rowCount === 0) {
			throw new AppError(404, 'This listing is no longer available.');
		}

		await connection.query('COMMIT');
		connection.release();

		// Delete images from R2 after successful database deletion
		if (imageUrls.length > 0) {
			try {
				const keysToDelete = imageUrls
					.map((url: string) => extractKeyFromUrl(url))
					.filter((key): key is string => key !== null);

				if (keysToDelete.length > 0) {
					logger.info(
						`Deleting ${keysToDelete.length} image(s) from R2 storage`
					);
					await deleteMultipleFilesFromR2(keysToDelete);
					logger.info('Successfully deleted images from R2 storage');
				}
			} catch (r2Error) {
				// Log error but don't fail the request since DB deletion succeeded
				const errorMessage =
					r2Error instanceof Error
						? r2Error.message
						: 'Unknown error';
				logger.error(
					`Failed to delete images from R2: ${errorMessage}`
				);
				logger.warn(
					'Listing deleted from database but images remain in R2 storage'
				);
			}
		}

		res.status(200).send({
			message: 'Listing deleted successfully',
		});
	} catch (error) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(
			`Unexpected error during delete listing: ${error.message}`
		);
		throw new AppError(
			500,
			'Unable to delete your listing. Please try again.'
		);
	}
}

export default deleteListing;
