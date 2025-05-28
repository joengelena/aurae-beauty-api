import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';

async function updateLising(req: Request, res: Response) {
	logger.info(`Updating listing with id '${req.params.id}'`);

	try {
		const vehicleId = req.params.id;
		const { currentUserId, ...newListingData } = req.body;

		if (Object.keys(newListingData).length === 0) {
			res.statusMessage = 'Bad request. No fields to update';
			res.status(400).send();
			return;
		}

		const vehicle = await vehicleRepository.getVehicleById(vehicleId);

		if (currentUserId !== vehicle[0].userIdFk) {
			logger.error('Trying to edit someone else is listing');
			res.statusMessage =
				'Forbidden. Invalid credentials. You are not the owner of this listing';
			res.status(403).send();
			return;
		}

		const editVehicleResult = await vehicleRepository.updateVehicleWithId(
			req.params.id,
			newListingData
		);

		if (editVehicleResult.affectedRows === 1) {
			res.statusMessage = 'Listing edited successfully';
			res.status(200).send({
				message: 'Listing edited successfully',
			});
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
