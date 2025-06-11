import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';

async function getListing(req: Request, res: Response) {
	logger.info(`Getting listing with id '${req.params.id}'`);

	try {
		const listingId = req.params.id;
		const listing = await listingRepository.getListingById(listingId);

		if (listing.length === 0) {
			res.statusMessage = 'Not found. No listing with specified id';
			res.status(404).send();
			return;
		}

		res.statusMessage = 'Listing found';
		res.status(200).send(listing);
		return;
	} catch (error) {
		logger.error(
			`Error getting listing with id '${req.params.id}': ${error}`
		);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default getListing;
