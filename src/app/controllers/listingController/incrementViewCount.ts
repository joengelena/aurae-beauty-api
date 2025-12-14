import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import AppError from '../../utils/errors/appError';

async function incrementViewCount(req: Request, res: Response): Promise<void> {
	const listingId = req.params.id;

	logger.info(`Incrementing view count for listing id '${listingId}'`);

	try {
		const result = await listingRepository.incrementViewCount(listingId);

		if (result.rowCount === 0) {
			throw new AppError(404, 'Listing not found.');
		}

		res.status(200).send({ message: 'View count incremented successfully' });
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(
			`Unexpected error during increment view count: ${error.message}`
		);
		throw new AppError(
			500,
			'Unable to increment view count. Please try again.'
		);
	}
}

export default incrementViewCount;
