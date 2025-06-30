import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';

async function deleteListing(req: Request, res: Response) {
	logger.info(`Deleting listing with id '${req.params.id}'`);

	try {
		const listingId = req.params.id;
		const currentUserId = req.body.currentUserId;

		const listing = await listingRepository.getListingById(listingId);

		if (listing.length === 0) {
			res.status(404).send('Not found. No listing with specified id');
			return;
		}

		if (currentUserId !== listing[0].userIdFk) {
			res.status(403).send(
				'Forbidden. Invalid credentials. You are not the owner of this listing'
			);
			return;
		}

		const deleteListingResult = await listingRepository.deleteListingWithId(
			listingId
		);

		if (deleteListingResult.affectedRows === 0) {
			res.status(404).send('Not found. No listing with specified id');
			return;
		}

		res.status(200).send('Listing deleted successfully');
		return;
	} catch (error) {
		logger.error(`Error deleting listing: ${error}`);
		res.status(500).send('Internal server error');
		return;
	}
}

export default deleteListing;
