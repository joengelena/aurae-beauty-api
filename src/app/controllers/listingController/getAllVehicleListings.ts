import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import { testQuery } from '../../resources/types';

async function getAllVehicleListings(req: Request, res: Response) {
	logger.info('Getting all vehicle listings from the database');

	try {
		const query: Partial<testQuery> = req.query;

		const vehicles = await vehicleRepository.getAllVehicles(query);

		res.statusMessage = 'Vehicles found';
		res.status(200).send(vehicles);
		return;
	} catch (error) {
		logger.error(`Error getting vehicle listing: ${error}`);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default getAllVehicleListings;
