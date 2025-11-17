import { Request, Response } from 'express';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import AppError from '../../utils/errors/appError';

async function updateLising(req: Request, res: Response): Promise<void> {
	const listingId = req.params.id;
	const { currentUserId, ...newListingData } = req.body;

	logger.info(`Updating listing with id '${listingId}'`);

	if (Object.keys(newListingData).length === 0) {
		throw new AppError(400, 'No changes to update.');
	}

	const connection = await getPool().getConnection();

	try {
		const listing = await listingRepository.getListingById(listingId, connection);

		if (listing.length === 0) {
			throw new AppError(404, 'This listing is no longer available.');
		}

		if (currentUserId !== listing[0].userIdFk) {
			throw new AppError(
				403,
				'You can only edit your own listings.'
			);
		}

		const editListingResult = await listingRepository.updateListingWithId(
			listingId,
			newListingData,
			connection
		);

		if (editListingResult.affectedRows === 1) {
			res.status(200).send({
				message: 'Listing updated successfully',
			});
		} else {
			throw new AppError(500, 'Unable to update your listing. Please try again.');
		}
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during update listing: ${error.message}`);
		throw new AppError(500, 'Unable to update your listing. Please try again.');
	} finally {
		connection.release();
	}
}

export default updateLising;
