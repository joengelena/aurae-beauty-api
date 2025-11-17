import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { addToWatchlist } from '../../repositories/watchlistRepository/watchlistRepository';
import AppError from '../../utils/errors/appError';

async function watchlistAdd(req: Request, res: Response): Promise<void> {
	const { currentUserId } = req.body;
	const listingId = req.params.listingId;

	logger.info(`Adding listing ${listingId} to watchlist for user ${currentUserId}`);

	const connection = await getPool().getConnection();

	try {
		const result = await addToWatchlist(currentUserId, Number(listingId), connection);

		if (result.affectedRows === 1) {
			res.status(200).send({
				message: 'Added to watchlist successfully',
			});
		} else {
			throw new AppError(400, 'Unable to add this listing to your watchlist. Please try again.');
		}
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		if (error.code === 'ER_DUP_ENTRY') {
			logger.warn(`Listing ${listingId} already in watchlist for user ${currentUserId}`);
			throw new AppError(409, 'This listing is already in your watchlist.');
		}

		if (error.code === 'ER_NO_REFERENCED_ROW_2') {
			logger.warn(`Invalid user or listing ID: user ${currentUserId}, listing ${listingId}`);
			throw new AppError(404, 'This listing no longer exists or has been removed.');
		}

		logger.error(`Unexpected error during add to watchlist: ${error.message}`);
		throw new AppError(500, 'Something went wrong. Please try again later.');
	} finally {
		connection.release();
	}
}

export default watchlistAdd;
