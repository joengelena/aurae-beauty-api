import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { addToWatchlist } from '../../repositories/watchlistRepository/watchlistRepository';
import AppError from '../../utils/errors/appError';

async function watchlistAdd(req: Request, res: Response): Promise<void> {
	const { currentUserId } = req.body;
	const listingId = req.params.listingId;

	logger.info(`Adding listing ${listingId} to watchlist for user ${currentUserId}`);

	try {
		const result = await addToWatchlist(currentUserId, Number(listingId));

		if (result.affectedRows === 1) {
			res.status(200).send({
				message: 'Added to watchlist successfully',
			});
		} else {
			throw new AppError(400, 'Could not add to watchlist');
		}
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		if (error.code === 'ER_DUP_ENTRY') {
			logger.warn(`Listing ${listingId} already in watchlist for user ${currentUserId}`);
			throw new AppError(409, 'Already in watchlist');
		}

		if (error.code === 'ER_NO_REFERENCED_ROW_2') {
			logger.warn(`Invalid user or listing ID: user ${currentUserId}, listing ${listingId}`);
			throw new AppError(400, 'Invalid user or listing ID');
		}

		logger.error(`Unexpected error during add to watchlist: ${error.message}`);
		throw new AppError(500, 'Internal Server Error');
	}
}

export default watchlistAdd;
