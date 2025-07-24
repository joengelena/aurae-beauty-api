import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';

async function getListingAttributes(req: Request, res: Response) {
	logger.info('Getting listing attributes from the database');

	try {
		const attributes = await listingRepository.getListingAttributes();

		res.status(200).send(attributes);
		return;
	} catch (error) {
		logger.error(`Error getting listing attributes: ${error}`);
		res.status(500).send('Internal server error');
		return;
	}
}

export default getListingAttributes;
