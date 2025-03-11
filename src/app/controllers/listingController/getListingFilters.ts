import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';

async function getListingFilters(req: Request, res: Response) {
	logger.info('Getting filters from the database');

	try {
		const filters = await listingRepository.getListingFilters();

		res.statusMessage = 'Successfully retrieved listing filters';
		res.status(200).send(filters);
		return;
	} catch (error) {
		logger.error(`Error getting filters: ${error}`);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default getListingFilters;
