import { Request, Response } from 'express';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { UserVehicle } from '../../resources/types';
import { getPool } from '../../../config/db';
import { uploadSingleImage } from '../../utils/cloudflare/uploadImages';
import { validateFile } from '../../utils/cloudflare/validation';
import { validateExpiryDate } from '../../utils/validation/vehicleValidation';

async function postVehicle(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const {
		make,
		model,
		year,
		licensePlate,
		color,
		fuelType,
		transmission,
		odometerReading,
		odometerUnit,
		regoExpiryDate,
		wofExpiryDate,
		notes,
	} = req.body;

	logger.info(`Creating new vehicle for user '${userId}'`);

	// Get uploaded file
	const file = req.file as Express.Multer.File | undefined;

	// Validate file if provided (optional)
	let vehiclePhotoUrl: string | null = null;
	if (file) {
		validateFile(file);
		logger.info(`Uploading vehicle image: ${file.originalname} (${file.size} bytes)`);
		const uploadResult = await uploadSingleImage(file);
		vehiclePhotoUrl = uploadResult.url;
		logger.info(`Successfully uploaded vehicle image: ${uploadResult.key}`);
	}

	// Validate dates BEFORE acquiring connection to avoid holding resources
	validateExpiryDate(regoExpiryDate, 'Registration expiry date');
	validateExpiryDate(wofExpiryDate, 'WOF expiry date');

	const connection = await getPool().getConnection();

	try {
		await connection.beginTransaction();

		const vehicleData: Omit<UserVehicle, 'id' | 'createdAt' | 'updatedAt'> = {
				userIdFk: userId,
				make,
				model,
				year,
				licensePlate: licensePlate ?? null,
				color: color ?? null,
				fuelType: fuelType ?? null,
				transmission: transmission ?? null,
				odometerReading: odometerReading ?? null,
				odometerUnit: odometerUnit ?? 'km',
				regoExpiryDate,
				wofExpiryDate,
				vehiclePhotoUrl,
				notes: notes ?? null,
			};

		const result = await vehicleRepository.postVehicle(
			vehicleData,
			connection
		);

		logger.info(
			`Vehicle created with id '${result.insertId}' for user '${userId}'`
		);

		const createdVehicle = await vehicleRepository.getVehicleById(
			result.insertId,
			connection
		);

		await connection.commit();
		connection.release();

		res.status(201).send({
			message: 'Vehicle created successfully',
			vehicle: createdVehicle,
		});
	} catch (error: any) {
		await connection.rollback();
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(
			`Unexpected error during vehicle creation: ${error.message}`
		);
		throw new AppError(500, 'Unable to create vehicle. Please try again.');
	}
}

export default postVehicle;
