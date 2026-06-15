import { Request, Response } from 'express';
import * as userRepository from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function getBusinessSettings(req: Request, res: Response): Promise<void> {
	const { currentUserId } = req.body;

	logger.info(`Getting business settings for user '${currentUserId}'`);

	try {
		const settings = await userRepository.getBusinessSettings(currentUserId);
		res.status(200).send(settings);
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		logger.error(`Unexpected error getting business settings: ${error.message}`);
		throw new AppError(500, 'Unable to load settings. Please try again.');
	}
}

export default getBusinessSettings;
