import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function getPublicDressBookings(req: Request, res: Response): Promise<void> {
	const dressId = parseInt(req.params.id as string, 10);

	if (isNaN(dressId)) {
		throw new AppError(400, 'Invalid dress ID');
	}

	logger.info(`Getting public availability for dress '${dressId}'`);

	const ranges = await rentalBookingRepository.getPublicAvailabilityByDressId(dressId);

	res.status(200).json(ranges);
}

export default getPublicDressBookings;
