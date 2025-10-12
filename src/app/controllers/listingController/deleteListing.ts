import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import AppError from '../../utils/errors/appError';

async function deleteListing(req: Request, res: Response): Promise<void> {
	const listingId = req.params.id;
	const currentUserId = req.body.currentUserId;

	logger.info(`Deleting listing with id '${listingId}'`);

	try {
		const listing = await listingRepository.getListingById(listingId);

		if (listing.length === 0) {
			throw new AppError(404, 'This listing is no longer available.');
		}

		if (currentUserId !== listing[0].userIdFk) {
			throw new AppError(
				403,
				'You can only delete your own listings.'
			);
		}

		const deleteListingResult = await listingRepository.deleteListingWithId(
			listingId
		);

		if (deleteListingResult.affectedRows === 0) {
			throw new AppError(404, 'This listing is no longer available.');
		}

		res.status(200).send({
			message: 'Listing deleted successfully',
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during delete listing: ${error.message}`);
		throw new AppError(500, 'Unable to delete your listing. Please try again.');
	}
}

export default deleteListing;
