import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import AppError from '../../utils/errors/appError';
import { uploadSingleImage } from '../../utils/cloudflare/uploadImages';
import { validateFile } from '../../utils/cloudflare/validation';
import {
	parseDressId,
	validateExpiryDate,
	verifyDressOwnership,
} from '../../utils/validation/dressValidation';
import { withTransaction } from '../../utils/database/transactionHandler';
import {
	extractKeyFromUrl,
	deleteFileFromR2,
} from '../../utils/cloudflare/r2Client';

async function patchDress(req: Request, res: Response): Promise<void> {
	const vehicleId = parseDressId(req.params.id as string);
	const { currentUserId, ...newVehicleData } = req.body;

	logger.info(`Updating dress with id '${vehicleId}'`);

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
			`Uploading dress image: ${file.originalname} (${file.size} bytes)`
		);
		const uploadResult = await uploadSingleImage(file);
		newVehicleData.dressPhotoUrl = uploadResult.url;
		logger.info(`Successfully uploaded dress image: ${uploadResult.key}`);
	}

	if (Object.keys(newVehicleData).length === 0) {
		// No changes to update, but return success anyway
		res.status(200).send({
			message: 'Dress updated successfully',
		});
		return;
	}

	let oldVehiclePhotoUrl: string | null = null;

	await withTransaction(
		async (connection) => {
			await verifyDressOwnership(vehicleId, currentUserId, connection);

			// Fetch old dress photo URL if a new image is being uploaded
			if (file) {
				const dress = await dressRepository.getDressById(
					vehicleId,
					connection
				);

				if (!dress) {
					throw new AppError(404, 'Dress not found');
				}

				oldVehiclePhotoUrl = dress.dressPhotoUrl;
				logger.info(
					`Old dress image URL: ${
						oldVehiclePhotoUrl ? 'exists' : 'none'
					}`
				);
			}

			const result = await dressRepository.updateVehicleById(
				vehicleId,
				newVehicleData,
				connection
			);

			if (result.rowCount !== 1) {
				throw new AppError(
					500,
					'Unable to update dress. Please try again.'
				);
			}

			res.status(200).send({
				message: 'Dress updated successfully',
			});
		},
		res,
		'update dress'
	);

	// Delete old image from R2 after successful database update
	if (file && oldVehiclePhotoUrl) {
		try {
			const key = extractKeyFromUrl(oldVehiclePhotoUrl);

			if (key) {
				logger.info(
					`Deleting old dress image from R2 storage: ${key}`
				);
				await deleteFileFromR2(key);
				logger.info(
					'Successfully deleted old dress image from R2 storage'
				);
			}
		} catch (r2Error) {
			// Log error but don't fail the request since DB update succeeded
			const errorMessage =
				r2Error instanceof Error ? r2Error.message : 'Unknown error';
			logger.error(
				`Failed to delete old dress image from R2: ${errorMessage}`
			);
			logger.warn(
				'Dress updated in database but old image remains in R2 storage'
			);
		}
	}
}

export default patchDress;
