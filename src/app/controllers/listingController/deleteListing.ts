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
			res.statusMessage = 'Not found. No listing with specified id';
			res.status(404).send();
			return;
		}

		if (currentUserId !== listing[0].userIdFk) {
			logger.error('Trying to delete someone else is listing');
			res.statusMessage =
				'Forbidden. Invalid credentials. You are not the owner of this listing';
			res.status(403).send();
			return;
		}

		const deleteListingResult = await listingRepository.deleteListingWithId(
			listingId
		);

		if (deleteListingResult.affectedRows === 0) {
			res.statusMessage = 'Not found. No listing with specified id';
			res.status(404).send();
			return;
		}

		res.statusMessage = 'Listing deleted successfully';
		res.status(200).send();
		return;
	} catch (error) {
		logger.error(`Error deleting listing: ${error}`);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default deleteListing;
