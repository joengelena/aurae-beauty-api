import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import AppError from '../../utils/errors/appError';
import { uploadSingleImage } from '../../utils/cloudflare/uploadImages';
import { validateFile } from '../../utils/cloudflare/validation';
import { parseVehicleId, validateExpiryDate, verifyVehicleOwnership } from '../../utils/validation/vehicleValidation';
import { withTransaction } from '../../utils/database/transactionHandler';

async function patchVehicle(req: Request, res: Response): Promise<void> {
	const vehicleId = parseVehicleId(req.params.id);
	const { currentUserId, ...newVehicleData } = req.body;

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

	await withTransaction(async (connection) => {
		await verifyVehicleOwnership(vehicleId, currentUserId, connection);

		const result = await vehicleRepository.updateVehicleById(
			vehicleId,
			newVehicleData,
			connection
		);

		if (result.affectedRows !== 1) {
			throw new AppError(500, 'Unable to update vehicle. Please try again.');
		}

		res.status(200).send({
			message: 'Vehicle updated successfully',
		});
	}, res, 'update vehicle');
}

export default patchVehicle;
