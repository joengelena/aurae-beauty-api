import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import AppError from '../../utils/errors/appError';
import { uploadSingleImage } from '../../utils/cloudflare/uploadImages';
import { validateFile } from '../../utils/cloudflare/validation';
import { validateExpiryDate } from '../../utils/validation/vehicleValidation';

async function patchVehicle(req: Request, res: Response): Promise<void> {
	const vehicleId = parseInt(req.params.id);
	const { currentUserId, ...newVehicleData } = req.body;

	if (isNaN(vehicleId)) {
		throw new AppError(400, 'Invalid vehicle ID');
	}

	logger.info(`Updating vehicle with id '${vehicleId}'`);

	// Validate dates BEFORE acquiring connection to avoid holding resources
	if (newVehicleData.regoExpiryDate) {
		validateExpiryDate(newVehicleData.regoExpiryDate, 'Registration expiry date');
	}

	if (newVehicleData.wofExpiryDate) {
		validateExpiryDate(newVehicleData.wofExpiryDate, 'WOF expiry date');
	}

	// Handle image upload if provided
	const file = req.file as Express.Multer.File | undefined;
	if (file) {
		validateFile(file);
		logger.info(`Uploading vehicle image: ${file.originalname} (${file.size} bytes)`);
		const uploadResult = await uploadSingleImage(file);
		newVehicleData.vehiclePhotoUrl = uploadResult.url;
		logger.info(`Successfully uploaded vehicle image: ${uploadResult.key}`);
	}

	if (Object.keys(newVehicleData).length === 0) {
		throw new AppError(400, 'No changes to update.');
	}

	const connection = await getPool().getConnection();

	try {
		await connection.beginTransaction();

		const vehicle = await vehicleRepository.getVehicleByIdAndUserId(
			vehicleId,
			currentUserId,
			connection
		);

		if (!vehicle) {
			throw new AppError(404, 'Vehicle not found or does not belong to you');
		}

		const updateVehicleResult = await vehicleRepository.updateVehicleById(
			vehicleId,
			newVehicleData,
			connection
		);

		if (updateVehicleResult.affectedRows === 1) {
			await connection.commit();
			connection.release();

			res.status(200).send({
				message: 'Vehicle updated successfully',
			});
		} else {
			throw new AppError(500, 'Unable to update vehicle. Please try again.');
		}
	} catch (error) {
		await connection.rollback();
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during vehicle update: ${error.message}`);
		throw new AppError(500, 'Unable to update vehicle. Please try again.');
	}
}

export default patchVehicle;
