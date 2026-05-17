import { Request, Response } from 'express';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { UserVehicle } from '../../resources/types';
import { getPool } from '../../../config/db';
import { uploadSingleImage } from '../../utils/cloudflare/uploadImages';
import { validateFile } from '../../utils/cloudflare/validation';
import { validateExpiryDate } from '../../utils/validation/dressValidation';

async function postDress(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const {
		make,
		model,
		year,
		nickname,
		licensePlate,
		color,
		fuelType,
		transmission,
		odometerReading,
		odometerUnit,
		regoExpiryDate,
		wofExpiryDate,
		insuranceExpiryDate,
		insuranceProvider,
		notes,
	} = req.body;

	logger.info(`Creating new dress for user '${userId}'`);

	// Get uploaded file
	const file = req.file as Express.Multer.File | undefined;

	// Validate file if provided (optional)
	let dressPhotoUrl: string | null = null;
	if (file) {
		validateFile(file);
		logger.info(
			`Uploading dress image: ${file.originalname} (${file.size} bytes)`
		);
		const uploadResult = await uploadSingleImage(file);
		dressPhotoUrl = uploadResult.url;
		logger.info(`Successfully uploaded dress image: ${uploadResult.key}`);
	}

	// Validate dates BEFORE acquiring connection to avoid holding resources
	validateExpiryDate(regoExpiryDate, 'Registration expiry date');
	validateExpiryDate(wofExpiryDate, 'WOF expiry date');
	validateExpiryDate(insuranceExpiryDate, 'Insurance expiry date');

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		const dressData: Omit<UserVehicle, 'id' | 'createdAt' | 'updatedAt'> ={
				userIdFk: userId,
				make,
				model,
				year,
				nickname: nickname ?? null,
				licensePlate: licensePlate ?? null,
				color: color ?? null,
				fuelType: fuelType ?? null,
				transmission: transmission ?? null,
				odometerReading: odometerReading ?? null,
				odometerUnit: odometerUnit ?? 'km',
				regoExpiryDate,
				wofExpiryDate,
				insuranceExpiryDate,
				insuranceProvider,
				dressPhotoUrl,
				notes: notes ?? null,
			};

		const result = await dressRepository.postDress(
			dressData,
			connection
		);

		const vehicleId = result.rows[0].id;

		logger.info(
			`Dress created with id '${vehicleId}' for user '${userId}'`
		);

		const createdVehicle = await dressRepository.getDressById(
			vehicleId,
			connection
		);

		await connection.query('COMMIT');
		connection.release();

		res.status(201).send({
			message: 'Dress created successfully',
			dress: createdVehicle,
		});
	} catch (error: any) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(
			`Unexpected error during dress creation: ${error.message}`
		);
		throw new AppError(500, 'Unable to create dress. Please try again.');
	}
}

export default postDress;
