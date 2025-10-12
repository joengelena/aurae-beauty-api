import logger from '../../../config/logger';
import { Request, Response } from 'express';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import uploadImages from '../../utils/cloudinary/uploadImages';
import { Listing } from '../../resources/types';
import AppError from '../../utils/errors/appError';

async function postListing(req: Request, res: Response): Promise<void> {
	logger.info('Posting new listing');

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

		if (files.length === 0) {
			throw new AppError(400, 'Please upload at least one image for your listing.');
		}

		const uploadedImagesUrls = await uploadImages(files);
		listingData.previewImgUrl = uploadedImagesUrls[0];

		const result = await listingRepository.postListing(listingData);

		let photoOrder = 0;
		for (const photoUrl of uploadedImagesUrls) {
			await listingRepository.postListingPhotoPath({
				listingIdFk: result.insertId,
				photoOrder,
				photoPath: photoUrl,
			});

			photoOrder++;
		}

		if (result.affectedRows === 1) {
			res.status(201).send({
				listingId: result.insertId,
			});
		} else {
			throw new AppError(500, 'Unable to create your listing. Please try again.');
		}
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during post listing: ${error.message}`);
		throw new AppError(500, 'Unable to create your listing. Please try again.');
	}
}

export default postListing;
