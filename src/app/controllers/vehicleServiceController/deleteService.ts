import { Request, Response } from 'express';
import * as vehicleServiceRepository from '../../repositories/vehicleServiceRepository/vehicleServiceRepository';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { getPool } from '../../../config/db';

async function deleteService(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const serviceId = parseInt(req.params.id as string, 10);

	if (isNaN(serviceId)) {
		throw new AppError(400, 'Invalid service ID');
	}

	logger.info(`Deleting service record '${serviceId}' by user '${userId}'`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		// Get the service record
		const service = await vehicleServiceRepository.getServiceById(
			serviceId,
			connection
		);

		if (!service) {
			throw new AppError(404, 'Service record not found');
		}

		// Verify user owns the vehicle that this service belongs to
		const vehicle = await vehicleRepository.getVehicleByIdAndUserId(
			service.vehicleIdFk,
			userId,
			connection
		);

		if (!vehicle) {
			throw new AppError(
				403,
				'You do not have permission to delete this service record'
			);
		}

		// Delete the service record
		await vehicleServiceRepository.deleteServiceById(serviceId, connection);

		await connection.query('COMMIT');
		connection.release();

		logger.info(
			`Service record '${serviceId}' deleted successfully by user '${userId}'`
		);

		res.status(200).send({
			message: 'Service record deleted successfully',
		});
	} catch (error: any) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during delete service: ${error.message}`);
		throw new AppError(
			500,
			'Unable to delete service record. Please try again.'
		);
	}
}

export default deleteService;
