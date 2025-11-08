import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { ListingQueryParams } from '../../resources/types';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import AppError from '../../utils/errors/appError';

async function getAllActiveListings(req: Request, res: Response): Promise<void> {
	logger.info('Getting all active listings from the database');

	try {
		const query: Partial<ListingQueryParams> = req.query;
		const currentUserId = req.body.currentUserId;

		// Add currentUserId to query params if user is authenticated
		if (currentUserId) {
			query.currentUserId = currentUserId;
			logger.info(`Adding currentUserId to query: ${currentUserId}`);
		} else {
			logger.info('No currentUserId found, fetching listings without watchlist status');
		}

		const listings = await listingRepository.getAllActiveListings(query);

		res.status(200).send(listings);
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during get all active listings: ${error.message}`);
		throw new AppError(500, 'Unable to load listings. Please try again.');
	}
}

export default getAllActiveListings;
