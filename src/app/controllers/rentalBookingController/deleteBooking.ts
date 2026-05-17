import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { getPool } from '../../../config/db';

async function deleteBooking(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const serviceId = parseInt(req.params.id as string, 10);

	if (isNaN(serviceId)) {
		throw new AppError(400, 'Invalid booking ID');
	}

	logger.info(`Deleting booking record '${serviceId}' by user '${userId}'`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		// Get the booking record
		const booking = await rentalBookingRepository.getServiceById(
			serviceId,
			connection
		);

		if (!booking) {
			throw new AppError(404, 'Service record not found');
		}

		// Verify user owns the vehicle that this service belongs to
		const dress = await dressRepository.getDressByIdAndUserId(
			booking.dressIdFk,
			userId,
			connection
		);

		if (!dress) {
			throw new AppError(
				403,
				'You do not have permission to delete this booking record'
			);
		}

		// Delete the booking record
		await rentalBookingRepository.deleteBookingById(serviceId, connection);

		await connection.query('COMMIT');
		connection.release();

		logger.info(
			`Service record '${serviceId}' deleted successfully by user '${userId}'`
		);

		res.status(200).send({
			message: 'Service record deleted successfully',
		});
	} catch (error: any) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during delete booking: ${error.message}`);
		throw new AppError(
			500,
			'Unable to delete booking record. Please try again.'
		);
	}
}

export default deleteBooking;
