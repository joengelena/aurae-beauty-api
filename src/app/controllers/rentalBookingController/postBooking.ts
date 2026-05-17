import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { VehicleService } from '../../resources/types';
import { getPool } from '../../../config/db';

async function postBooking(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const {
		dressIdFk,
		typeOfService,
		serviceDate,
		serviceProviderName,
		cost,
		notes,
	} = req.body;

	logger.info(`Adding booking record for dress '${dressIdFk}'`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		// Verify user owns the vehicle
		const dress = await dressRepository.getDressByIdAndUserId(
			dressIdFk,
			userId,
			connection
		);

		if (!dress) {
			throw new AppError(404, 'Dress not found');
		}

		// Prepare service data
		const serviceData: Omit<
			VehicleService,
			'id' | 'createdAt' | 'updatedAt'
		> = {
			dressIdFk,
			typeOfService,
			serviceDate,
			serviceProviderName: serviceProviderName || null,
			cost: cost || null,
			notes: notes || null,
		};

		const result = await rentalBookingRepository.postBooking(
			serviceData,
			connection
		);

		await connection.query('COMMIT');
		connection.release();

		logger.info(
			`Service record created for dress '${dressIdFk}' by user '${userId}'`
		);

		res.status(201).send({
			message: 'Service record added successfully',
			serviceId: result.rows[0]?.id,
		});
	} catch (error: any) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during post service: ${error.message}`);
		throw new AppError(
			500,
			'Unable to add service record. Please try again.'
		);
	}
}

export default postBooking;
