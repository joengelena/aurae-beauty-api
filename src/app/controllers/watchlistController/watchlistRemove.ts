import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { removeFromWatchlist } from '../../repositories/watchlistRepository/watchlistRepository';
import AppError from '../../utils/errors/appError';

async function watchlistRemove(req: Request, res: Response): Promise<void> {
	const { currentUserId } = req.body;
	const listingId = req.params.listingId as string;

	logger.info(`Removing listing ${listingId} from watchlist for user ${currentUserId}`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		const result = await removeFromWatchlist(
			currentUserId,
			Number(listingId),
			connection
		);

		if (result.rowCount === 1) {
			await connection.query('COMMIT');
			connection.release();

			res.status(200).send({
				message: 'Removed from watchlist successfully',
			});
		} else {
			throw new AppError(404, 'This listing is not in your watchlist.');
		}
	} catch (error) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		if (error.code === 'ER_DUP_ENTRY') {
			logger.warn(`Duplicate entry error for user ${currentUserId}, listing ${listingId}`);
			throw new AppError(409, 'This listing is already in your watchlist.');
		}

		if (error.code === 'ER_NO_REFERENCED_ROW_2') {
			logger.warn(`Invalid user or listing ID: user ${currentUserId}, listing ${listingId}`);
			throw new AppError(404, 'This listing no longer exists or has been removed.');
		}

		logger.error(`Unexpected error during remove from watchlist: ${error.message}`);
		throw new AppError(500, 'Something went wrong. Please try again later.');
	}
}

export default watchlistRemove;
