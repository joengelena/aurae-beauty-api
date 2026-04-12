import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import AppError from '../../utils/errors/appError';
import { validateFiles } from '../../utils/cloudflare/validation';
import uploadImages from '../../utils/cloudflare/uploadImages';
import {
	extractKeyFromUrl,
	deleteMultipleFilesFromR2,
} from '../../utils/cloudflare/r2Client';

async function updateLising(req: Request, res: Response): Promise<void> {
	const listingId = req.params.id as string;
	const { currentUserId, ...newListingData } = req.body;

	logger.info(`Updating listing with id '${listingId}'`);

	// Get uploaded files (if any)
	const files = req.files as Express.Multer.File[] | undefined;

	// Check if there are any changes to update
	if (
		Object.keys(newListingData).length === 0 &&
		(!files || files.length === 0)
	) {
		throw new AppError(400, 'No changes to update.');
	}

	const connection = await getPool().connect();
	let oldImageUrls: string[] = [];

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
			throw new AppError(403, 'You can only edit your own listings.');
		}

		// Handle image updates if files are provided
		if (files && files.length > 0) {
			// Store old image URLs before deleting from database
			oldImageUrls = listing[0].imageUrls || [];
			logger.info(
				`Found ${oldImageUrls.length} existing image(s) to delete from R2`
			);

			// Validate files before uploading
			validateFiles(files);

			// Upload new images to Cloudflare R2
			logger.info(
				`Uploading ${files.length} new images for listing ${listingId}`
			);
			const uploadResult = await uploadImages(files);

			// Delete old photos from database
			await listingRepository.deleteListingPhotos(
				parseInt(listingId, 10),
				connection
			);

			// Insert new photo URLs
			await listingRepository.postListingPhotoPaths(
				parseInt(listingId, 10),
				uploadResult.urls,
				connection
			);

			// Update preview image URL to the first uploaded image
			newListingData.previewImgUrl = uploadResult.urls[0];
		}

		// Update listing data if there are changes
		if (Object.keys(newListingData).length > 0) {
			const editListingResult =
				await listingRepository.updateListingWithId(
					listingId,
					newListingData,
					connection
				);

			if (editListingResult.rowCount !== 1) {
				throw new AppError(
					500,
					'Unable to update your listing. Please try again.'
				);
			}
		}

		await connection.query('COMMIT');
		connection.release();

		// Delete old images from R2 after successful database update
		if (files && files.length > 0 && oldImageUrls.length > 0) {
			try {
				const keysToDelete = oldImageUrls
					.map((url: string) => extractKeyFromUrl(url))
					.filter((key): key is string => key !== null);

				if (keysToDelete.length > 0) {
					logger.info(
						`Deleting ${keysToDelete.length} old image(s) from R2 storage`
					);
					await deleteMultipleFilesFromR2(keysToDelete);
					logger.info(
						'Successfully deleted old images from R2 storage'
					);
				}
			} catch (r2Error) {
				// Log error but don't fail the request since DB update succeeded
				const errorMessage =
					r2Error instanceof Error
						? r2Error.message
						: 'Unknown error';
				logger.error(
					`Failed to delete old images from R2: ${errorMessage}`
				);
				logger.warn(
					'Listing updated in database but old images remain in R2 storage'
				);
			}
		}

		res.status(200).send({
			message: 'Listing updated successfully',
		});
	} catch (error) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		logger.error(`Unexpected error during update listing: ${errorMessage}`);
		throw new AppError(
			500,
			'Unable to update your listing. Please try again.'
		);
	}
}

export default updateLising;
