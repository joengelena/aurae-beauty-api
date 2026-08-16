import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { getPool } from '../../../config/db';

const cancellableStatuses = ['pending', 'confirmed'];

async function cancelMyBooking(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId as string;
	const bookingId = parseInt(req.params.id as string, 10);

	if (isNaN(bookingId)) {
		throw new AppError(400, 'Invalid booking ID');
	}

	logger.info(`Renter cancelling booking '${bookingId}' for user '${userId}'`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		const booking = await rentalBookingRepository.getServiceById(bookingId, connection);

		if (!booking) {
			throw new AppError(404, 'Booking not found');
		}

		const users = await userRepository.getUserById(userId, connection);
		const renter = users[0];

		if (!renter || !renter.email || booking.renterEmail !== renter.email) {
			throw new AppError(403, 'You do not have permission to cancel this booking');
		}

		if (!cancellableStatuses.includes(booking.status)) {
			throw new AppError(400, 'This booking can no longer be cancelled');
		}

		await rentalBookingRepository.updateServiceById(
			bookingId,
			{ status: 'cancelled' },
			connection
		);

		await connection.query('COMMIT');
		connection.release();

		logger.info(`Booking '${bookingId}' cancelled by renter '${userId}'`);

		res.status(200).send({
			message: 'Booking cancelled',
		});
	} catch (error: any) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during cancel booking: ${error.message}`);
		throw new AppError(500, 'Unable to cancel booking. Please try again.');
	}
}

export default cancelMyBooking;
