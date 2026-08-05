import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { DressBooking } from '../../resources/types';
import { getPool } from '../../../config/db';

async function postBooking(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const {
		dressIdFk,
		bookingType,
		bookingDate,
		startDate,
		endDate,
		renterName,
		renterEmail,
		renterPhone,
		renterInstagram,
		totalCost,
		depositPaid,
		status,
		notes,
	} = req.body;

	logger.info(`Adding booking record for dress '${dressIdFk}'`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		// Verify user belongs to the business that owns this dress
		const ownerUserId = await businessRepository.resolveOwnerUserIdForMember(
			userId,
			connection
		);
		const dress = ownerUserId
			? await dressRepository.getDressByIdAndUserId(dressIdFk, ownerUserId, connection)
			: null;

		if (!dress) {
			throw new AppError(404, 'Dress not found');
		}

		const hasConflict = await rentalBookingRepository.hasBookingConflict(
			dressIdFk,
			startDate,
			endDate,
			connection
		);
		if (hasConflict) {
			throw new AppError(409, 'Those dates are not available');
		}

		// Prepare booking data
		const serviceData: Omit<
			DressBooking,
			'id' | 'createdAt' | 'updatedAt'
		> = {
			dressIdFk,
			bookingType: bookingType || 'rental',
			bookingDate: bookingDate || startDate,
			startDate,
			endDate,
			renterName,
			renterEmail: renterEmail || null,
			renterPhone: renterPhone || null,
			renterInstagram: renterInstagram || null,
			totalCost: totalCost ?? 0,
			depositPaid: depositPaid || null,
			status: status || 'pending',
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
			message: 'Booking added successfully',
			bookingId: result.rows[0]?.id,
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
