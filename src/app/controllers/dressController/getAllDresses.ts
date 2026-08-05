import { Request, Response } from 'express';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function getAllDresses(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;

	logger.info(`Getting all dresses for user '${userId}'`);

	try {
		const ownerUserId = await businessRepository.resolveOwnerUserIdForMember(userId);

		if (!ownerUserId) {
			throw new AppError(403, "You don't belong to a business");
		}

		const vehicles = await dressRepository.getAllDressesByUserId(ownerUserId);

		res.status(200).send(vehicles);
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during get all dresses: ${error.message}`);
		throw new AppError(500, 'Unable to load dresss. Please try again.');
	}
}

export default getAllDresses;
