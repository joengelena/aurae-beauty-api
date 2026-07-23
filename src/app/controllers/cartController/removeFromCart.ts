import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { removeFromCart as removeFromCartRepo } from '../../repositories/cartRepository/cartRepository';
import AppError from '../../utils/errors/appError';

async function removeFromCart(req: Request, res: Response): Promise<void> {
	const { currentUserId } = req.body;
	const cartItemId = req.params.id as string;

	logger.info(`Removing cart item ${cartItemId} for user ${currentUserId}`);

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		const result = await removeFromCartRepo(
			currentUserId,
			Number(cartItemId),
			connection
		);

		if (result.rowCount === 1) {
			await connection.query('COMMIT');
			connection.release();

			res.status(200).send({
				message: 'Removed from cart successfully',
			});
		} else {
			throw new AppError(404, 'This item is not in your cart.');
		}
	} catch (error) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during remove from cart: ${error.message}`);
		throw new AppError(500, 'Something went wrong. Please try again later.');
	}
}

export default removeFromCart;
