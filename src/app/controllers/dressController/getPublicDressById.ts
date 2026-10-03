import { Request, Response } from 'express';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { parseDressId } from '../../utils/validation/dressValidation';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';

const getPublicDressById = async (req: Request, res: Response): Promise<void> => {
	const dressId = parseDressId(req.params.id as string);

	logger.info(`Getting public dress with id '${dressId}'`);

	try {
		const dress = await dressRepository.getPublicDressById(dressId);

		if (!dress) {
			throw new AppError(404, 'Dress not found');
		}

		res.status(200).json(dress);
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error getting public dress '${dressId}': ${error.message}`);
		throw new AppError(500, 'Unable to load dress. Please try again.');
	}
};

export default getPublicDressById;
