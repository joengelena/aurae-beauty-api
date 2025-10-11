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
			throw new AppError(404, 'Not found. No listing with specified id');
		}

		if (currentUserId !== listing[0].userIdFk) {
			throw new AppError(
				403,
				'Forbidden. Invalid credentials. You are not the owner of this listing'
			);
		}

		const deleteListingResult = await listingRepository.deleteListingWithId(
			listingId
		);

		if (deleteListingResult.affectedRows === 0) {
			throw new AppError(404, 'Not found. No listing with specified id');
		}

		res.status(200).send({
			message: 'Listing deleted successfully',
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during delete listing: ${error.message}`);
		throw new AppError(500, 'Internal Server Error');
	}
}

export default deleteListing;
