import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';

async function updateLising(req: Request, res: Response) {
	logger.info(`Updating listing with id '${req.params.id}'`);

	try {
		const listingId = req.params.id;
		const { currentUserId, ...newListingData } = req.body;

		if (Object.keys(newListingData).length === 0) {
			res.statusMessage = 'Bad request. No fields to update';
			res.status(400).send();
			return;
		}

		const listing = await listingRepository.getListingById(listingId);

		if (currentUserId !== listing[0].userIdFk) {
			logger.error('Trying to edit someone else is listing');
			res.statusMessage =
				'Forbidden. Invalid credentials. You are not the owner of this listing';
			res.status(403).send();
			return;
		}

		const editListingResult = await listingRepository.updateListingWithId(
			req.params.id,
			newListingData
		);

		if (editListingResult.affectedRows === 1) {
			res.statusMessage = 'Listing edited successfully';
			res.status(200).send();
			return;
		}
	} catch (error) {
		logger.error(`Error editing listing: ${error}`);
		res.statusMessage = 'Internal Server Error';
		res.status(500).send();
		return;
	}
}

export default updateLising;
