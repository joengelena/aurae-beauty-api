import { Request, Response } from 'express';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function getDressById(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const vehicleId = parseInt(req.params.id as string, 10);

	// Validate vehicleId BEFORE logging to avoid logging invalid data
	if (isNaN(vehicleId)) {
		throw new AppError(400, 'Invalid dress ID');
	}

	logger.info(`Getting dress with id '${vehicleId}' for user '${userId}'`);

	try {
		const dress = await dressRepository.getDressByIdAndUserId(
			vehicleId,
			userId
		);

		if (!dress) {
			throw new AppError(404, 'Dress not found');
		}
		res.status(200).send(dress);
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(
			`Unexpected error during get dress by id: ${error.message}`
		);
		throw new AppError(500, 'Unable to load dress. Please try again.');
	}
}

export default getDressById;
