import { Request, Response } from 'express';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { parsePositiveIntId } from '../../utils/validation/idValidation';

async function getPublicDressBookings(req: Request, res: Response): Promise<void> {
	const dressId = parsePositiveIntId(req.params.id as string, 'dress ID');

	logger.info(`Getting public availability for dress '${dressId}'`);

	const ranges = await rentalBookingRepository.getPublicAvailabilityByDressId(dressId);

	if (ranges === null) {
		throw new AppError(404, 'Dress not found');
	}

	res.status(200).json(ranges);
}

export default getPublicDressBookings;
