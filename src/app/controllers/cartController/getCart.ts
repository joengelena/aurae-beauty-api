import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { getUserCart } from '../../repositories/cartRepository/cartRepository';
import { hasBookingConflict } from '../../repositories/rentalBookingRepository/dressBookingRepository';
import AppError from '../../utils/errors/appError';

// The cart query already renders its dates as YYYY-MM-DD, so the common path is
// a pass-through. The Date branch stays for any caller that hands over a raw pg
// DATE — parsing one back through new Date() would reintroduce the timezone
// shift this is here to avoid.
function toDateOnly(value: Date | string): string {
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return value;
	}

	const d = new Date(value);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

async function getCart(req: Request, res: Response): Promise<void> {
	const { currentUserId } = req.body;

	logger.info(`Getting cart for user ${currentUserId}`);

	try {
		const cart = await getUserCart(currentUserId);

		// A cart holds dates over time, so an item that was free when it was added
		// can be taken by the time the renter comes back to it. Flagging it here
		// lets the cart show the item as unavailable, instead of checkout being the
		// first thing that notices.
		const cartWithAvailability = await Promise.all(
			cart.map(async (item) => ({
				...item,
				isAvailable: !(await hasBookingConflict(
					item.dressIdFk,
					toDateOnly(item.startDate),
					toDateOnly(item.endDate)
				)),
			}))
		);

		res.status(200).json(cartWithAvailability);
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during get cart: ${error.message}`);
		throw new AppError(500, 'Internal Server Error');
	}
}

export default getCart;
