import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { addToWatchlist } from '../../repositories/watchlistRepository/watchlistRepository';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import AppError from '../../utils/errors/appError';

async function watchlistAdd(req: Request, res: Response): Promise<void> {
	const { currentUserId } = req.body;
	const listingId = parseInt(req.params.listingId as string, 10);

	if (isNaN(listingId)) {
		throw new AppError(400, 'Invalid listing ID');
	}

	logger.info(`Adding listing ${listingId} to watchlist for user ${currentUserId}`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		// Only a listing the public can see may be watchlisted. Without this a
		// private dress could be added by id and its details read back through
		// GET /user/watchlist.
		const dress = await dressRepository.getPublicDressById(listingId, connection);
		if (!dress) {
			throw new AppError(404, 'This listing no longer exists or has been removed.');
		}

		const result = await addToWatchlist(currentUserId, listingId, connection);

		if (result.rowCount === 1) {
			await connection.query('COMMIT');
			connection.release();

			res.status(200).send({
				message: 'Added to watchlist successfully',
			});
		} else {
			throw new AppError(400, 'Unable to add this listing to your watchlist. Please try again.');
		}
	} catch (error) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		// Postgres unique_violation: the (user, dress) primary key already exists.
		if (error.code === '23505') {
			logger.warn(`Listing ${listingId} already in watchlist for user ${currentUserId}`);
			throw new AppError(409, 'This listing is already in your watchlist.');
		}

		// Postgres foreign_key_violation: the dress (or user) row is gone.
		if (error.code === '23503') {
			logger.warn(`Invalid user or listing ID: user ${currentUserId}, listing ${listingId}`);
			throw new AppError(404, 'This listing no longer exists or has been removed.');
		}

		logger.error(`Unexpected error during add to watchlist: ${error.message}`);
		throw new AppError(500, 'Something went wrong. Please try again later.');
	}
}

export default watchlistAdd;
