import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { DressBooking } from '../../resources/types';
import { getPool } from '../../../config/db';

async function patchBooking(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const bookingId = parseInt(req.params.id as string, 10);

	if (isNaN(bookingId)) {
		throw new AppError(400, 'Invalid booking ID');
	}

	const {
		currentUserId,
		...updateFields
	} = req.body;

	if (Object.keys(updateFields).length === 0) {
		throw new AppError(400, 'No fields provided to update');
	}

	logger.info(`Updating booking record '${bookingId}' by user '${userId}'`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		// The status-event trigger reads this to attribute the transition.
		//
		// set_config rather than SET LOCAL: SET is parsed before parameters are
		// bound, so it cannot take a placeholder — 'SET LOCAL x = $1' is a syntax
		// error, and interpolating the id into the string would be an injection
		// waiting to happen. set_config is an ordinary function call, so the id
		// binds properly. Its third argument is is_local, which scopes the value
		// to this transaction so a pooled connection cannot carry one caller's
		// identity into the next request.
		await connection.query('SELECT set_config($1, $2, true)', [
			'app.actor_user_id',
			userId,
		]);

		const booking = await rentalBookingRepository.getServiceById(
			bookingId,
			connection
		);

		if (!booking) {
			throw new AppError(404, 'Booking record not found');
		}

		const ownerUserId = await businessRepository.resolveOwnerUserIdForMember(
			userId,
			connection
		);
		const dress = ownerUserId
			? await dressRepository.getDressByIdAndUserId(
					booking.dressIdFk,
					ownerUserId,
					connection
				)
			: null;

		if (!dress) {
			throw new AppError(
				403,
				'You do not have permission to update this booking record'
			);
		}

		if (updateFields.startDate !== undefined || updateFields.endDate !== undefined) {
			const effectiveStartDate = updateFields.startDate ?? booking.startDate;
			const effectiveEndDate = updateFields.endDate ?? booking.endDate;
			const hasConflict = await rentalBookingRepository.hasBookingConflict(
				booking.dressIdFk,
				effectiveStartDate,
				effectiveEndDate,
				connection,
				bookingId
			);
			if (hasConflict) {
				throw new AppError(409, 'Those dates are not available');
			}
		}

		await rentalBookingRepository.updateServiceById(
			bookingId,
			updateFields as Partial<
				Omit<DressBooking, 'id' | 'dressIdFk' | 'createdAt' | 'updatedAt'>
			>,
			connection
		);

		await connection.query('COMMIT');
		connection.release();

		logger.info(
			`Booking record '${bookingId}' updated successfully by user '${userId}'`
		);

		res.status(200).send({
			message: 'Booking updated successfully',
		});
	} catch (error: any) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		// The booking state machine lives in a trigger, so an illegal move
		// arrives here as a Postgres check_violation. That is a bad request, not
		// a server fault — returning 500 told the owner to "try again" for
		// something that will never succeed. The trigger's message already names
		// both statuses, so it is worth passing through.
		if (error.code === '23514' || error.code === '23P01') {
			logger.info(`Rejected booking update '${bookingId}': ${error.message}`);
			throw new AppError(409, error.message);
		}

		logger.error(`Unexpected error during patch booking: ${error.message}`);
		throw new AppError(
			500,
			'Unable to update booking record. Please try again.'
		);
	}
}

export default patchBooking;
