import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { ListingQueryParams } from '../../resources/types';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';

async function getAllListings(req: Request, res: Response) {
	logger.info('Getting all listings from the database');

	try {
		const query: Partial<ListingQueryParams> = req.query;

		const listings = await listingRepository.getAllListings(query);

		res.status(200).send(listings);
		return;
	} catch (error) {
		logger.error(`Error getting all listings: ${error}`);
		res.status(500).send('Internal server error');
		return;
	}
}

export default getAllListings;
