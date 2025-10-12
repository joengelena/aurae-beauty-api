import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import AppError from '../../utils/errors/appError';

async function getListingAttributes(req: Request, res: Response): Promise<void> {
	logger.info('Getting listing attributes from the database');

	try {
		const attributes = await listingRepository.getListingAttributes();

		res.status(200).send(attributes);
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during get listing attributes: ${error.message}`);
		throw new AppError(500, 'Unable to load filter options. Please try again.');
	}
}

export default getListingAttributes;
