import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import AppError from '../../utils/errors/appError';
import { validateFiles } from '../../utils/cloudflare/validation';
import uploadImages from '../../utils/cloudflare/uploadImages';

async function updateLising(req: Request, res: Response): Promise<void> {
	const listingId = req.params.id;
	const { currentUserId, ...newListingData } = req.body;

	logger.info(`Updating listing with id '${listingId}'`);

	// Get uploaded files (if any)
	const files = req.files as Express.Multer.File[] | undefined;

	// Check if there are any changes to update
	if (Object.keys(newListingData).length === 0 && (!files || files.length === 0)) {
		throw new AppError(400, 'No changes to update.');
	}

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		const listing = await listingRepository.getListingById(listingId, connection);

		if (listing.length === 0) {
			throw new AppError(404, 'This listing is no longer available.');
		}

		if (currentUserId !== listing[0].userIdFk) {
			throw new AppError(
				403,
				'You can only edit your own listings.'
			);
		}

		// Handle image updates if files are provided
		if (files && files.length > 0) {
			// Validate files before uploading
			validateFiles(files);

			// Upload new images to Cloudflare R2
			logger.info(`Uploading ${files.length} new images for listing ${listingId}`);
			const uploadResult = await uploadImages(files);

			// Delete old photos from database
			await listingRepository.deleteListingPhotos(parseInt(listingId, 10), connection);

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
			const editListingResult = await listingRepository.updateListingWithId(
				listingId,
				newListingData,
				connection
			);

			if (editListingResult.rowCount !== 1) {
				throw new AppError(500, 'Unable to update your listing. Please try again.');
			}
		}

		await connection.query('COMMIT');
		connection.release();

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
		throw new AppError(500, 'Unable to update your listing. Please try again.');
	}
}

export default updateLising;
