import { Request, Response } from 'express';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function updateBusinessSettings(req: Request, res: Response): Promise<void> {
	const { currentUserId, ...settingsFields } = req.body;

	logger.info(`Updating business settings for user '${currentUserId}'`);

	try {
		const updated = await userRepository.updateBusinessSettings(currentUserId, settingsFields);
		res.status(200).send(updated);
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		logger.error(`Unexpected error updating business settings: ${error.message}`);
		throw new AppError(500, 'Unable to save settings. Please try again.');
	}
}

export default updateBusinessSettings;
