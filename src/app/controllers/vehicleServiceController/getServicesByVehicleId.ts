import { Request, Response } from 'express';
import * as vehicleServiceRepository from '../../repositories/vehicleServiceRepository/vehicleServiceRepository';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function getServicesByVehicleId(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const vehicleId = parseInt(req.params.id);

	logger.info(`Getting service records for vehicle '${vehicleId}'`);

	// Verify user owns the vehicle
	const vehicle = await vehicleRepository.getVehicleByIdAndUserId(
		vehicleId,
		userId
	);

	if (!vehicle) {
		throw new AppError(404, 'Vehicle not found');
	}

	const services = await vehicleServiceRepository.getAllServicesByVehicleId(vehicleId);

	logger.info(`Retrieved ${services.length} service records for vehicle '${vehicleId}'`);

	res.status(200).send(services);
}

export default getServicesByVehicleId;
