import { Request, Response } from 'express';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function getVehicleById(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const vehicleId = parseInt(req.params.id as string, 10);

	// Validate vehicleId BEFORE logging to avoid logging invalid data
	if (isNaN(vehicleId)) {
		throw new AppError(400, 'Invalid vehicle ID');
	}

	logger.info(`Getting vehicle with id '${vehicleId}' for user '${userId}'`);

	try {
		const vehicle = await vehicleRepository.getVehicleByIdAndUserId(
			vehicleId,
			userId
		);

		if (!vehicle) {
			throw new AppError(404, 'Vehicle not found');
		}
		res.status(200).send(vehicle);
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(
			`Unexpected error during get vehicle by id: ${error.message}`
		);
		throw new AppError(500, 'Unable to load vehicle. Please try again.');
	}
}

export default getVehicleById;
