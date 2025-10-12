import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import AppError from '../../utils/errors/appError';

async function getListing(req: Request, res: Response): Promise<void> {
	const listingId = req.params.id;

	logger.info(`Getting listing with id '${listingId}'`);

	try {
		const listing = await listingRepository.getListingById(listingId);

		if (listing.length === 0) {
			throw new AppError(404, 'This listing is no longer available.');
		}

		res.status(200).send(listing[0]);
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during get listing: ${error.message}`);
		throw new AppError(500, 'Unable to load this listing. Please try again.');
	}
}

export default getListing;
