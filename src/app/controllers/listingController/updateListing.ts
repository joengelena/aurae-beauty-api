import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';

async function updateLising(req: Request, res: Response) {
	logger.info(`Updating listing with id '${req.params.id}'`);

	try {
		const listingId = req.params.id;
		const { currentUserId, ...newListingData } = req.body;

		if (Object.keys(newListingData).length === 0) {
			res.status(400).send('Bad request. No fields to update');
			return;
		}

		const listing = await listingRepository.getListingById(listingId);

		if (currentUserId !== listing[0].userIdFk) {
			res.status(403).send(
				'Forbidden. Invalid credentials. You are not the owner of this listing'
			);
			return;
		}

		const editListingResult = await listingRepository.updateListingWithId(
			req.params.id,
			newListingData
		);

		if (editListingResult.affectedRows === 1) {
			res.status(200).send();
			return;
		}
	} catch (error) {
		logger.error(`Error editing listing: ${error}`);
		res.status(500).send('Internal Server Error');
		return;
	}
}

export default updateLising;
