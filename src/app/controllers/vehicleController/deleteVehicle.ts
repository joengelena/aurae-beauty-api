import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import AppError from '../../utils/errors/appError';
import {
	parseVehicleId,
	verifyVehicleOwnership,
} from '../../utils/validation/vehicleValidation';
import { withTransaction } from '../../utils/database/transactionHandler';
import {
	extractKeyFromUrl,
	deleteFileFromR2,
} from '../../utils/cloudflare/r2Client';

async function deleteVehicle(req: Request, res: Response): Promise<void> {
	const vehicleId = parseVehicleId(req.params.id as string);
	const currentUserId = req.body.currentUserId;

	logger.info(`Deleting vehicle with id '${vehicleId}'`);

	let vehiclePhotoUrl: string | null = null;

	await withTransaction(
		async (connection) => {
			await verifyVehicleOwnership(vehicleId, currentUserId, connection);

			// Fetch vehicle data to get image URL before deletion
			const vehicle = await vehicleRepository.getVehicleById(
				vehicleId,
				connection
			);

			if (!vehicle) {
				throw new AppError(404, 'Vehicle not found');
			}

			vehiclePhotoUrl = vehicle.vehiclePhotoUrl;
			logger.info(
				`Vehicle has image URL: ${vehiclePhotoUrl ? 'yes' : 'no'}`
			);

			const result = await vehicleRepository.deleteVehicleById(
				vehicleId,
				connection
			);

			if (result.rowCount === 0) {
				throw new AppError(404, 'Vehicle not found');
			}

			res.status(200).send({
				message: 'Vehicle deleted successfully',
			});
		},
		res,
		'delete vehicle'
	);

	// Delete image from R2 after successful database deletion
	if (vehiclePhotoUrl) {
		try {
			const key = extractKeyFromUrl(vehiclePhotoUrl);

			if (key) {
				logger.info(`Deleting vehicle image from R2 storage: ${key}`);
				await deleteFileFromR2(key);
				logger.info(
					'Successfully deleted vehicle image from R2 storage'
				);
			}
		} catch (r2Error) {
			// Log error but don't fail the request since DB deletion succeeded
			const errorMessage =
				r2Error instanceof Error ? r2Error.message : 'Unknown error';
			logger.error(
				`Failed to delete vehicle image from R2: ${errorMessage}`
			);
			logger.warn(
				'Vehicle deleted from database but image remains in R2 storage'
			);
		}
	}
}

export default deleteVehicle;
