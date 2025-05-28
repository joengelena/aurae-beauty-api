import logger from '../../../config/logger';
import { Request, Response } from 'express';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';

async function postListing(req: Request, res: Response) {
	logger.info('Posting new listing');

	try {
		const { currentUserId, photoPaths, ...listingData } = req.body;

		if (currentUserId !== listingData.userIdFk) {
			logger.error('Trying to post a listing for someone else');
			res.statusMessage = 'Forbidden. Invalid credentials';
			res.status(403).send();
			return;
		}

		let currentPhotoOrder = 1;

		Object.keys(photoPaths).forEach((path) => {
			// The regex will test to see if the key is a number
			if (!/^\d+$/.test(path)) {
				logger.error('Invalid photo order format');
				res.statusMessage =
					'Invalid photo order. Photo order must be a number';
				res.status(403).send();
				return;
			}

			if (Number(path) !== currentPhotoOrder) {
				logger.error('Invalid photo order');
				res.statusMessage =
					'Invalid photo order. Photo order must be sequential';
				res.status(403).send();
				return;
			}

			currentPhotoOrder++;
		});

		const result = await vehicleRepository.postVehicle(listingData);

		Object.keys(photoPaths).forEach(async (path) => {
			await vehicleRepository.postVehiclePhotoPath({
				vehicleListingIdFk: result.insertId,
				photoOrder: Number(path),
				photoPath: photoPaths[path],
			});
		});

		if (result.affectedRows === 1) {
			res.statusMessage = 'Listing posted successfully';
			res.status(201).send({
				vehicleId: result.insertId,
			});
			return;
		}

		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	} catch (error) {
		logger.error(`Error posting listing: ${error}`);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default postListing;
