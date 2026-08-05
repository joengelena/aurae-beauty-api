import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function getAllUserBookings(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;

	logger.info(`Getting all booking records for user '${userId}'`);

	const ownerUserId = await businessRepository.resolveOwnerUserIdForMember(userId);

	if (!ownerUserId) {
		throw new AppError(403, "You don't belong to a business");
	}

	const bookings = await rentalBookingRepository.getAllBookingsByUserId(ownerUserId);

	logger.info(`Retrieved ${bookings.length} booking records for user '${userId}'`);

	res.status(200).send(bookings);
}

export default getAllUserBookings;
