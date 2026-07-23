import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { getUserCart } from '../../repositories/cartRepository/cartRepository';
import AppError from '../../utils/errors/appError';

async function getCart(req: Request, res: Response): Promise<void> {
	const { currentUserId } = req.body;

	logger.info(`Getting cart for user ${currentUserId}`);

	try {
		const cart = await getUserCart(currentUserId);

		res.status(200).json(cart);
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during get cart: ${error.message}`);
		throw new AppError(500, 'Internal Server Error');
	}
}

export default getCart;
