import logger from '../../../config/logger';
import { Request, Response } from 'express';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import uploadImages from '../../utils/cloudinary/uploadImages';
import { Listing } from '../../resources/types';

async function postListing(req: Request, res: Response) {
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
			res.status(400).send('Bad request. No images for listing');
			return;
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
			return;
		}

		res.status(500).send('Internal server error');
		return;
	} catch (error) {
		logger.error(`Error posting listing: ${error}`);
		res.status(500).send('Internal server error');
		return;
	}
}

export default postListing;
