import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import { addToCart as addToCartRepo } from '../../repositories/cartRepository/cartRepository';
import AppError from '../../utils/errors/appError';

async function addToCart(req: Request, res: Response): Promise<void> {
	const { currentUserId, dressId, startDate, endDate } = req.body as {
		currentUserId: string;
		dressId: number;
		startDate: string;
		endDate: string;
	};

	logger.info(`Adding dress ${dressId} to cart for user ${currentUserId}`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		// Verify dress is public
		const dress = await dressRepository.getPublicDressById(dressId, connection);
		if (!dress) {
			throw new AppError(404, 'Dress not found');
		}

		// Can't add your own dress to your cart
		if (dress.userIdFk === currentUserId) {
			throw new AppError(403, 'You cannot add your own dress to your cart');
		}

		// Price is snapshotted server-side (not trusted from the client) so the
		// total a renter saw stays stable even if the price changes later.
		const result = await addToCartRepo(
			currentUserId,
			dressId,
			startDate,
			endDate,
			dress.rentalPricePerDay ?? 0,
			connection
		);

		await connection.query('COMMIT');
		connection.release();

		res.status(201).json({
			message: 'Added to cart',
			cartItemId: result.rows[0]?.id,
		});
	} catch (error: any) {
		await connection.query('ROLLBACK');
		connection.release();
		if (error instanceof AppError) throw error;
		logger.error(`Unexpected error during add to cart: ${error.message}`);
		throw new AppError(500, 'Unable to add to cart. Please try again.');
	}
}

export default addToCart;
