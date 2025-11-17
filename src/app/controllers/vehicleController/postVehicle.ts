import { Request, Response } from 'express';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { UserVehicle } from '../../resources/types';
import { getPool } from '../../../config/db';

async function postVehicle(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const {
		make,
		model,
		year,
		licensePlate,
		vin,
		color,
		fuelType,
		transmission,
		odometerReading,
		odometerUnit,
		regoExpiryDate,
		wofExpiryDate,
		vehiclePhotoUrl,
		isPrimary,
		purchaseDate,
		notes,
	} = req.body;

	logger.info(`Creating new vehicle for user '${userId}'`);

	// Validate dates BEFORE acquiring connection to avoid holding resources
	const today = new Date();
	const oneYearAgo = new Date(today);
	oneYearAgo.setFullYear(today.getFullYear() - 1);

	if (regoExpiryDate) {
		const regoDate = new Date(regoExpiryDate);
		if (regoDate < oneYearAgo) {
			throw new AppError(
				400,
				'Registration expiry date cannot be more than 1 year in the past'
			);
		}
	}

	if (wofExpiryDate) {
		const wofDate = new Date(wofExpiryDate);
		if (wofDate < oneYearAgo) {
			throw new AppError(
				400,
				'WOF expiry date cannot be more than 1 year in the past'
			);
		}
	}

	if (purchaseDate) {
		const purchaseDateObj = new Date(purchaseDate);
		if (purchaseDateObj > today) {
			throw new AppError(400, 'Purchase date cannot be in the future');
		}
	}

	// Acquire connection only after validation passes
	const connection = await getPool().getConnection();

	try {
		await connection.beginTransaction();

		// Check if user has any existing vehicles (within transaction to prevent race conditions)
		const existingVehicles = await vehicleRepository.getAllVehiclesByUserId(
			userId,
			connection
		);

		// Auto-set as primary if this is the user's first vehicle
		const shouldBePrimary = isPrimary === 1 || existingVehicles.length === 0;

		// If this vehicle is being set as primary, unset all other primary vehicles
		if (shouldBePrimary) {
			await vehicleRepository.unsetPrimaryVehicleForUser(userId, connection);
			logger.info(`Unset all primary vehicles for user '${userId}'`);
		}

		const vehicleData: Omit<UserVehicle, 'id' | 'createdAt' | 'updatedAt'> = {
			userIdFk: userId,
			make,
			model,
			year,
			licensePlate: licensePlate ?? null,
			vin: vin ?? null,
			color: color ?? null,
			fuelType: fuelType ?? null,
			transmission: transmission ?? null,
			odometerReading: odometerReading ?? null,
			odometerUnit: odometerUnit ?? 'km',
			regoExpiryDate: regoExpiryDate ?? null,
			wofExpiryDate: wofExpiryDate ?? null,
			vehiclePhotoUrl: vehiclePhotoUrl ?? null,
			isPrimary: shouldBePrimary ? 1 : 0,
			purchaseDate: purchaseDate ?? null,
			notes: notes ?? null,
		};

		const result = await vehicleRepository.postVehicle(vehicleData, connection);

		logger.info(`Vehicle created with id '${result.insertId}' for user '${userId}'`);

		// Fetch the created vehicle BEFORE committing (within transaction boundary)
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

		logger.error(`Unexpected error during vehicle creation: ${error.message}`);
		throw new AppError(500, 'Unable to create vehicle. Please try again.');
	}
}

export default postVehicle;
