import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { getUserWatchlist } from '../../repositories/watchlistRepository/watchlistRepository';
import AppError from '../../utils/errors/appError';

async function watchlistGet(req: Request, res: Response): Promise<void> {
	const { currentUserId } = req.body;

	logger.info(`Getting watchlist for user ${currentUserId}`);

	try {
		const watchlist = await getUserWatchlist(currentUserId);

		res.status(200).json(watchlist);
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during get watchlist: ${error.message}`);
		logger.error(`Error details: ${JSON.stringify(error)}`);
		throw new AppError(500, 'Internal Server Error');
	}
}

export default watchlistGet;
