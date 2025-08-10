import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';

async function getListing(req: Request, res: Response) {
	logger.info(`Getting listing with id '${req.params.id}'`);

	try {
		const listingId = req.params.id;
		const listing = await listingRepository.getListingById(listingId);

		if (listing.length === 0) {
			res.status(404).send('Not found. No listing with specified id');
			return;
		}

		res.status(200).send(listing[0]);
		return;
	} catch (error) {
		logger.error(
			`Error getting listing with id '${req.params.id}': ${error}`
		);
		res.status(500).send('Internal server error');
		return;
	}
}

export default getListing;
