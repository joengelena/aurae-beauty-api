import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { getPool } from '../../../config/db';
import { parsePositiveIntId } from '../../utils/validation/idValidation';

// Once the dress is on its way to her there is no self-service cancel — the
// owner has already started fulfilling, so that conversation belongs between
// the two of them.
const cancellableStatuses = ['pending', 'approved'];

async function cancelMyBooking(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId as string;
	const bookingId = parsePositiveIntId(req.params.id as string, 'booking ID');

	logger.info(`Renter cancelling booking '${bookingId}' for user '${userId}'`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		// Same attribution as patchBooking — without it the audit trail records a
		// cancellation with nobody's name against it, which is half the point of
		// splitting cancelled into cancelled_by_customer and cancelled_by_owner.
		await connection.query('SELECT set_config($1, $2, true)', [
			'app.actor_user_id',
			userId,
		]);

		const booking = await rentalBookingRepository.getServiceById(bookingId, connection);

		if (!booking) {
			throw new AppError(404, 'Booking not found');
		}

		// Compared on the profile id, not on renter_email. Matching emails meant a
		// renter who changed hers could no longer cancel her own booking, and it
		// also meant anyone who happened to hold the address on the booking could.
		// A NULL id is an owner-taken offline booking — no account owns it, so no
		// account may cancel it here.
		if (booking.customerUserIdFk !== userId) {
			throw new AppError(403, 'You do not have permission to cancel this booking');
		}

		if (!cancellableStatuses.includes(booking.status)) {
			throw new AppError(400, 'This booking can no longer be cancelled');
		}

		await rentalBookingRepository.updateServiceById(
			bookingId,
			// Attributed, not anonymous: 'cancelled' recorded no actor, so a customer
			// changing her mind and an owner pulling the booking were indistinguishable.
			{ status: 'cancelled_by_customer' },
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

		// The controller checks cancellableStatuses first, so this should be
		// unreachable — but if the state machine ever disagrees with that list,
		// say so rather than reporting a server fault.
		if (error.code === '23514' || error.code === '23P01') {
			// The raw text names the trigger and both statuses, which is what the
			// log wants and what the client must not see — error-responses.md is
			// explicit that database detail stays server-side.
			logger.info(`Rejected cancel of booking '${bookingId}': ${error.message}`);
			throw new AppError(
				409,
				'That change is not allowed for this booking right now. Reload it to see where it has got to.'
			);
		}

		logger.error(`Unexpected error during cancel booking: ${error.message}`);
		throw new AppError(500, 'Unable to cancel booking. Please try again.');
	}
}

export default cancelMyBooking;
