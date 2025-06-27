import logger from '../../../config/logger';
import { Request, Response } from 'express';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import uploadImages from '../../utils/cloudinary/uploadImages';

async function postListing(req: Request, res: Response) {
	logger.info('Posting new listing');

	try {
		const { currentUserId, ...listingData } = req.body;

		if (currentUserId !== listingData.userIdFk) {
			logger.error('Trying to post a listing for someone else');
			res.statusMessage = 'Forbidden. Invalid credentials';
			res.status(403).send();
			return;
		}

		// Files are in the order that it was sent in the request
		// therefore order matters
		const files = req.files as Express.Multer.File[];

		if (files.length === 0) {
			res.statusMessage = 'Bad request. No images for listing';
			res.status(400).send();
			return;
		}

		const result = await listingRepository.postListing(listingData);

		const uploadedImagesUrls = await uploadImages(files);
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
			res.statusMessage = 'Listing posted successfully';
			res.status(201).send({
				listingId: result.insertId,
			});
			return;
		}

		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	} catch (error) {
		logger.error(`Error posting listing: ${error}`);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default postListing;
