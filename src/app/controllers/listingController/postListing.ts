import logger from '../../../config/logger';
import { Request, Response } from 'express';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import uploadImages from '../../utils/cloudflare/uploadImages';
import { validateFiles } from '../../utils/cloudflare/validation';
import { Listing } from '../../resources/types';
import AppError from '../../utils/errors/appError';
import { getPool } from '../../../config/db';

async function postListing(req: Request, res: Response): Promise<void> {
	logger.info('Posting new listing');

	const connection = await getPool().getConnection();

	try {
		const { currentUserId, ...listingData } = req.body;

		const postListingDetails = listingData as Omit<
			Listing,
			'id' | 'viewCount'
		>;

		postListingDetails.userIdFk = currentUserId;

		// Files are in the order that it was sent in the request
		// therefore order matters
		const files = req.files as Express.Multer.File[];

		// Validate files before uploading
		validateFiles(files);

		// Upload images to Cloudflare R2
		const uploadResult = await uploadImages(files);
		listingData.previewImgUrl = uploadResult.urls[0];

		await connection.beginTransaction();

		const result = await listingRepository.postListing(
			listingData,
			connection
		);

		await listingRepository.postListingPhotoPaths(
			result.insertId,
			uploadResult.urls,
			connection
		);

		await connection.commit();
		connection.release();

		if (result.affectedRows === 1) {
			res.status(201).send({
				listingId: result.insertId,
			});
		} else {
			throw new AppError(
				500,
				'Unable to create your listing. Please try again.'
			);
		}
	} catch (error) {
		await connection.rollback();
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		logger.error(`Unexpected error during post listing: ${errorMessage}`);
		throw new AppError(
			500,
			'Unable to create your listing. Please try again.'
		);
	}
}

export default postListing;
