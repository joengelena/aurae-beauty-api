import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';

async function deleteListing(req: Request, res: Response) {
	logger.info(`Deleting listing with id '${req.params.id}'`);

	try {
		const vehicleId = req.params.id;
		const currentUserId = req.body.currentUserId;

		const vehicle = await vehicleRepository.getVehicleById(vehicleId);

		if (vehicle.length === 0) {
			res.statusMessage = 'Not found. No listing with specified id';
			res.status(404).send();
			return;
		}

		if (currentUserId !== vehicle[0].userIdFk) {
			logger.error('Trying to delete someone else is listing');
			res.statusMessage =
				'Forbidden. Invalid credentials. You are not the owner of this listing';
			res.status(403).send();
			return;
		}

		const deleteVehicleResult = await vehicleRepository.deleteVehicleWithId(
			vehicleId
		);

		if (deleteVehicleResult.affectedRows === 0) {
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
