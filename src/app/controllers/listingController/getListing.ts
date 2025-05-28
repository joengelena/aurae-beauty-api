import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';

async function getListing(req: Request, res: Response) {
	logger.info(`Getting listing with id '${req.params.id}'`);

	try {
		const vehicleId = req.params.id;
		const vehicle = await vehicleRepository.getVehicleById(vehicleId);

		if (vehicle.length === 0) {
			res.statusMessage = 'Not found. No listing with specified id';
			res.status(404).send();
			return;
		}

		res.statusMessage = 'listing found';
		res.status(200).send(vehicle);
		return;
	} catch (error) {
		logger.error(
			`Error getting listing with id '${req.params.id}': ${error}`
		);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default getListing;
