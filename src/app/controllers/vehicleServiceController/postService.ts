import { Request, Response } from 'express';
import * as vehicleServiceRepository from '../../repositories/vehicleServiceRepository/vehicleServiceRepository';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { VehicleService } from '../../resources/types';
import { getPool } from '../../../config/db';

async function postService(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const {
		vehicleIdFk,
		typeOfService,
		serviceDate,
		serviceProviderName,
		cost,
		notes,
	} = req.body;

	logger.info(`Adding service record for vehicle '${vehicleIdFk}'`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		// Verify user owns the vehicle
		const vehicle = await vehicleRepository.getVehicleByIdAndUserId(
			vehicleIdFk,
			userId,
			connection
		);

		if (!vehicle) {
			throw new AppError(404, 'Vehicle not found');
		}

		// Prepare service data
		const serviceData: Omit<
			VehicleService,
			'id' | 'createdAt' | 'updatedAt'
		> = {
			vehicleIdFk,
			typeOfService,
			serviceDate,
			serviceProviderName: serviceProviderName || null,
			cost: cost || null,
			notes: notes || null,
		};

		const result = await vehicleServiceRepository.postService(
			serviceData,
			connection
		);

		await connection.query('COMMIT');
		connection.release();

		logger.info(
			`Service record created for vehicle '${vehicleIdFk}' by user '${userId}'`
		);

		res.status(201).send({
			message: 'Service record added successfully',
			serviceId: result.rows[0]?.id,
		});
	} catch (error: any) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during post service: ${error.message}`);
		throw new AppError(
			500,
			'Unable to add service record. Please try again.'
		);
	}
}

export default postService;
