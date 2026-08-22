import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { getPool } from '../../../config/db';

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

		// Booking your own dress is deliberately allowed. Every account has a
		// Customer profile alongside any business it owns, and while acting as
		// a customer an owner is just another renter — including for their own
		// stock (holding a dress for themselves, a friend, an event). The
		// booking still lands in their Wardrobe calendar and still consumes
		// availability, which is the point.

		// Check for date conflicts with existing active bookings, manual blocks,
		// and the dress's post-rental cleaning buffer
		const hasConflict = await rentalBookingRepository.hasBookingConflict(
			dressId,
			startDate,
			endDate,
			connection
		);
		if (hasConflict) {
			throw new AppError(409, 'Those dates are not available');
		}

		// Get renter info from their user profile
		const users = await userRepository.getUserById(userId, connection);
		if (!users || users.length === 0) {
			throw new AppError(404, 'User profile not found');
		}
		const renter = users[0];

		// Priced by nights, not by inclusive days: a rental is a whole day that goes
		// overnight, so the 23rd to the 24th is one night at one day's rate. This has
		// to match CartItem.nights and DateRangeSelection in the app, which is where
		// the renter reads the price before she commits to it.
		const start = new Date(startDate);
		const end = new Date(endDate);
		const nights = Math.max(
			1,
			Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
		);
		const totalCost = (dress.rentalPricePerDay ?? 0) * nights;

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
				status: 'pending',
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
