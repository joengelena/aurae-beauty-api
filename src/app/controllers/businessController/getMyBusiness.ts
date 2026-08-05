import { Request, Response } from 'express';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';

async function getMyBusiness(req: Request, res: Response): Promise<void> {
	const currentUserId = req.body.currentUserId;

	try {
		const membership = await businessRepository.getMembershipForUser(currentUserId);

		if (!membership) {
			// A customer-only account with no business is a legitimate state, not a failure.
			res.status(200).send({ business: null, role: null });
			return;
		}

		const business = await businessRepository.getBusinessById(membership.businessId);

		res.status(200).send({ business, role: membership.role });
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error getting business: ${error.message}`);
		throw new AppError(500, 'Unable to load your business. Please try again.');
	}
}

export default getMyBusiness;
