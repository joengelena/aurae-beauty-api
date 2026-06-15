import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { getPool } from '../../../config/db';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

async function postSelfBooking(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId as string;
	const dressId = parseInt(req.params.id as string, 10);
	const { startDate, endDate } = req.body as { startDate: string; endDate: string };

	if (isNaN(dressId)) {
		throw new AppError(400, 'Invalid dress ID');
	}

	logger.info(`Self-booking dress '${dressId}' for user '${userId}'`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		// Verify dress is public
		const dress = await dressRepository.getPublicDressById(dressId, connection);
		if (!dress) {
			throw new AppError(404, 'Dress not found');
		}

		// Can't book your own dress
		if (dress.userIdFk === userId) {
			throw new AppError(403, 'You cannot book your own dress');
		}

		// Check for date conflicts with existing active bookings
		const conflictQuery = convertQueryPlaceholders(`
			SELECT id FROM "dress_bookings"
			WHERE dress_id_fk = ?
			  AND status NOT IN ('cancelled', 'returned')
			  AND start_date <= ?
			  AND end_date >= ?
		`);
		const conflicts = await connection.query(conflictQuery, [dressId, endDate, startDate]);
		if (conflicts.rows.length > 0) {
			throw new AppError(409, 'Those dates are not available');
		}

		// Get renter info from their user profile
		const users = await userRepository.getUserById(userId, connection);
		if (!users || users.length === 0) {
			throw new AppError(404, 'User profile not found');
		}
		const renter = users[0];

		// Calculate total cost server-side (days inclusive of both start and end)
		const start = new Date(startDate);
		const end = new Date(endDate);
		const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
		const totalCost = (dress.rentalPricePerDay ?? 0) * days;

		const result = await rentalBookingRepository.postBooking(
			{
				dressIdFk: dressId,
				bookingType: 'rental',
				bookingDate: startDate,
				startDate,
				endDate,
				renterName: `${renter.firstName} ${renter.lastName}`,
				renterEmail: renter.email ?? null,
				renterPhone: renter.phoneNumber ?? null,
				renterInstagram: renter.instagram ?? null,
				totalCost,
				depositPaid: null,
				status: 'confirmed',
				notes: null,
			},
			connection
		);

		await connection.query('COMMIT');
		connection.release();

		logger.info(`Self-booking created for dress '${dressId}' by user '${userId}'`);

		res.status(201).json({
			message: 'Booking request sent',
			bookingId: result.rows[0]?.id,
		});
	} catch (error: any) {
		await connection.query('ROLLBACK');
		connection.release();
		if (error instanceof AppError) throw error;
		logger.error(`Unexpected error during self-booking: ${error.message}`);
		throw new AppError(500, 'Unable to create booking. Please try again.');
	}
}

export default postSelfBooking;
