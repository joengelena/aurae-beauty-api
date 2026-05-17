import { Request, Response } from 'express';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function getAllDresses(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;

	logger.info(`Getting all vehicles for user '${userId}'`);

	try {
		const vehicles = await dressRepository.getAllDressesByUserId(userId);

		res.status(200).send(vehicles);
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during get all vehicles: ${error.message}`);
		throw new AppError(500, 'Unable to load dresss. Please try again.');
	}
}

export default getAllDresses;
