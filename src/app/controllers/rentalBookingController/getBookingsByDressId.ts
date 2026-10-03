import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function getBookingsByDressId(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const dressId = parseInt(req.params.id as string, 10);

	logger.info(`Getting booking records for dress '${dressId}'`);

	// Verify user belongs to the business that owns this dress
	const ownerUserId = await businessRepository.resolveOwnerUserIdForMember(userId);
	const dress = ownerUserId
		? await dressRepository.getDressByIdAndUserId(dressId, ownerUserId)
		: null;

	if (!dress) {
		throw new AppError(404, 'Dress not found');
	}

	const bookings = await rentalBookingRepository.getBookingsByDressId(dressId);

	logger.info(`Retrieved ${bookings.length} booking records for dress '${dressId}'`);

	res.status(200).send(bookings);
}

export default getBookingsByDressId;
