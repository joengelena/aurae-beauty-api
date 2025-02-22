import logger from '../../../config/logger';
import { Request, Response } from 'express';
import { Vehicle } from '../../resources/types';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';

async function postVehicle(req: Request, res: Response) {
	logger.info('Posting new vehicle');

	try {
		const { currentUserId, photoPaths, ...vehicleData } = req.body;

		if (currentUserId !== vehicleData.userIdFk) {
			logger.error('Trying to post someone else vehicle');
			res.statusMessage = 'Forbidden. Invalid credentials';
			res.status(403).send();
			return;
		}

		const result = await vehicleRepository.postVehicle(vehicleData);

		for (const key in photoPaths) {
			await vehicleRepository.postVehiclePhotoPath({
				vehicleListingIdFk: result.insertId,
				photoOrder: Number(key),
				photoPath: photoPaths[key],
			});
		}

		if (result.affectedRows === 1) {
			res.statusMessage = 'Vehicle added successfully';
			res.status(201).send();
			return;
		}

		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	} catch (error) {
		logger.error(`Error posting vehicle: ${error}`);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default postVehicle;
