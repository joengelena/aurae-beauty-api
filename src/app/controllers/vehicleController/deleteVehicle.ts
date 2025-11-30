import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import AppError from '../../utils/errors/appError';
import { parseVehicleId, verifyVehicleOwnership } from '../../utils/validation/vehicleValidation';
import { withTransaction } from '../../utils/database/transactionHandler';

async function deleteVehicle(req: Request, res: Response): Promise<void> {
	const vehicleId = parseVehicleId(req.params.id);
	const currentUserId = req.body.currentUserId;

	logger.info(`Deleting vehicle with id '${vehicleId}'`);

	await withTransaction(async (connection) => {
		await verifyVehicleOwnership(vehicleId, currentUserId, connection);

		const result = await vehicleRepository.deleteVehicleById(vehicleId, connection);

		if (result.affectedRows === 0) {
			throw new AppError(404, 'Vehicle not found');
		}

		res.status(200).send({
			message: 'Vehicle deleted successfully',
		});
	}, res, 'delete vehicle');
}

export default deleteVehicle;
