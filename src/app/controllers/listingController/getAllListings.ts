import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import { testQuery } from '../../resources/types';

async function getAllListings(req: Request, res: Response) {
	logger.info('Getting all listings from the database');

	try {
		const query: Partial<testQuery> = req.query;

		const vehicles = await vehicleRepository.getAllListings(query);

		res.statusMessage = 'listings found';
		res.status(200).send(vehicles);
		return;
	} catch (error) {
		logger.error(`Error getting all listings: ${error}`);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default getAllListings;
