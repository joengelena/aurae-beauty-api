import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import logger from '../../../config/logger';

async function getAllUserBookings(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;

	logger.info(`Getting all booking records for user '${userId}'`);

	const bookings = await rentalBookingRepository.getAllBookingsByUserId(userId);

	logger.info(`Retrieved ${bookings.length} booking records for user '${userId}'`);

	res.status(200).send(bookings);
}

export default getAllUserBookings;
