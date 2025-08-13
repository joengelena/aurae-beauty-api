import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { addToWatchlist } from '../../repositories/watchlistRepository/watchlistRepository';

async function watchlistAdd(req: Request, res: Response) {
	try {
		const { currentUserId } = req.body;
		const listingId = req.params.listingId;

		const result = await addToWatchlist(currentUserId, Number(listingId));

		if (result.affectedRows === 1) {
			res.status(200).send();
			return;
		}

		res.status(400).send('Could not add to watchlist');
		return;
	} catch (error) {
		logger.error(`Error adding to watchlist: ${error}`);

		if (error.code === 'ER_DUP_ENTRY') {
			res.status(409).send('Already in watchlist');
			return;
		}

		if (error.code === 'ER_NO_REFERENCED_ROW_2') {
			res.status(400).send('Invalid user or listing ID');
			return;
		}

		res.status(500).send('Internal server error');
		return;
	}
}

export default watchlistAdd;
