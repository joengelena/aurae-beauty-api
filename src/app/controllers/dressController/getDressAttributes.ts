import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import AppError from '../../utils/errors/appError';

async function getDressAttributes(req: Request, res: Response): Promise<void> {
	logger.info('Getting dress attributes from the database');

	try {
		const attributes = await dressRepository.getDressAttributes();

		res.status(200).send(attributes);
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during get dress attributes: ${error.message}`);
		throw new AppError(500, 'Unable to load filter options. Please try again.');
	}
}

export default getDressAttributes;
