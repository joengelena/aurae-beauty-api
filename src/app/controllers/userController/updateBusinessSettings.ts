import { Request, Response } from 'express';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function updateBusinessSettings(req: Request, res: Response): Promise<void> {
	const { currentUserId, ...settingsFields } = req.body;

	logger.info(`Updating business settings for user '${currentUserId}'`);

	try {
		const membership = await businessRepository.getMembershipForUser(currentUserId);

		if (!membership) {
			throw new AppError(403, 'You need to own a business to update these settings');
		}

		if (membership.role !== 'owner') {
			throw new AppError(403, 'Only the business owner can update these settings');
		}

		const updated = await businessRepository.updateBusinessSettings(
			membership.businessId,
			settingsFields
		);
		res.status(200).send(updated);
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		logger.error(`Unexpected error updating business settings: ${error.message}`);
		throw new AppError(500, 'Unable to save settings. Please try again.');
	}
}

export default updateBusinessSettings;
