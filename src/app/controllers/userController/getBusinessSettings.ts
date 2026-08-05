import { Request, Response } from 'express';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function getBusinessSettings(req: Request, res: Response): Promise<void> {
	const { currentUserId } = req.body;

	logger.info(`Getting business settings for user '${currentUserId}'`);

	try {
		const membership = await businessRepository.getMembershipForUser(currentUserId);

		if (!membership) {
			// No business at all (customer-only account) — return the same default
			// every account used to get from the old business_settings column default.
			res.status(200).send({ deliveryOption: 'pickup' });
			return;
		}

		// Both owner and staff can read settings — several existing pages call this
		// unconditionally for any signed-in user, and reading isn't sensitive.
		const settings = await businessRepository.getBusinessSettings(membership.businessId);
		res.status(200).send(settings);
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		logger.error(`Unexpected error getting business settings: ${error.message}`);
		throw new AppError(500, 'Unable to load settings. Please try again.');
	}
}

export default getBusinessSettings;
