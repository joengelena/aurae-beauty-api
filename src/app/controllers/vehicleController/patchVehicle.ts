import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import AppError from '../../utils/errors/appError';
import { uploadSingleImage } from '../../utils/cloudflare/uploadImages';
import { validateFile } from '../../utils/cloudflare/validation';
import {
	parseVehicleId,
	validateExpiryDate,
	verifyVehicleOwnership,
} from '../../utils/validation/vehicleValidation';
import { withTransaction } from '../../utils/database/transactionHandler';
import {
	extractKeyFromUrl,
	deleteFileFromR2,
} from '../../utils/cloudflare/r2Client';

async function patchVehicle(req: Request, res: Response): Promise<void> {
	const vehicleId = parseVehicleId(req.params.id as string);
	const { currentUserId, ...newVehicleData } = req.body;

	logger.info(`Updating vehicle with id '${vehicleId}'`);

	// Validate dates BEFORE acquiring connection to avoid holding resources
	if (newVehicleData.regoExpiryDate) {
		validateExpiryDate(
			newVehicleData.regoExpiryDate,
			'Registration expiry date'
		);
	}

	if (newVehicleData.wofExpiryDate) {
		validateExpiryDate(newVehicleData.wofExpiryDate, 'WOF expiry date');
	}

	if (newVehicleData.insuranceExpiryDate) {
		validateExpiryDate(
			newVehicleData.insuranceExpiryDate,
			'Insurance expiry date'
		);
	}

	// Handle image upload if provided
	const file = req.file as Express.Multer.File | undefined;
	if (file) {
		validateFile(file);
		logger.info(
			`Uploading vehicle image: ${file.originalname} (${file.size} bytes)`
		);
		const uploadResult = await uploadSingleImage(file);
		newVehicleData.vehiclePhotoUrl = uploadResult.url;
		logger.info(`Successfully uploaded vehicle image: ${uploadResult.key}`);
	}

	if (Object.keys(newVehicleData).length === 0) {
		// No changes to update, but return success anyway
		res.status(200).send({
			message: 'Vehicle updated successfully',
		});
		return;
	}

	let oldVehiclePhotoUrl: string | null = null;

	await withTransaction(
		async (connection) => {
			await verifyVehicleOwnership(vehicleId, currentUserId, connection);

			// Fetch old vehicle photo URL if a new image is being uploaded
			if (file) {
				const vehicle = await vehicleRepository.getVehicleById(
					vehicleId,
					connection
				);

				if (!vehicle) {
					throw new AppError(404, 'Vehicle not found');
				}

				oldVehiclePhotoUrl = vehicle.vehiclePhotoUrl;
				logger.info(
					`Old vehicle image URL: ${
						oldVehiclePhotoUrl ? 'exists' : 'none'
					}`
				);
			}

			const result = await vehicleRepository.updateVehicleById(
				vehicleId,
				newVehicleData,
				connection
			);

			if (result.rowCount !== 1) {
				throw new AppError(
					500,
					'Unable to update vehicle. Please try again.'
				);
			}

			res.status(200).send({
				message: 'Vehicle updated successfully',
			});
		},
		res,
		'update vehicle'
	);

	// Delete old image from R2 after successful database update
	if (file && oldVehiclePhotoUrl) {
		try {
			const key = extractKeyFromUrl(oldVehiclePhotoUrl);

			if (key) {
				logger.info(
					`Deleting old vehicle image from R2 storage: ${key}`
				);
				await deleteFileFromR2(key);
				logger.info(
					'Successfully deleted old vehicle image from R2 storage'
				);
			}
		} catch (r2Error) {
			// Log error but don't fail the request since DB update succeeded
			const errorMessage =
				r2Error instanceof Error ? r2Error.message : 'Unknown error';
			logger.error(
				`Failed to delete old vehicle image from R2: ${errorMessage}`
			);
			logger.warn(
				'Vehicle updated in database but old image remains in R2 storage'
			);
		}
	}
}

export default patchVehicle;
