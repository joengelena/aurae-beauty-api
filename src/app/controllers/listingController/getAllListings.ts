import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { ListingQueryParams } from '../../resources/types';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import AppError from '../../utils/errors/appError';

async function getAllListings(req: Request, res: Response): Promise<void> {
	logger.info('Getting all listings from the database');

	try {
		const query: Partial<ListingQueryParams> = req.query;

		const listings = await listingRepository.getAllListings(query);

		res.status(200).send(listings);
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during get all listings: ${error.message}`);
		throw new AppError(500, 'Internal Server Error');
	}
}

export default getAllListings;
