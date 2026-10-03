import { Request, Response } from 'express';
import * as dressDamageIncidentRepository from '../../repositories/dressDamageIncidentRepository/dressDamageIncidentRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { parseDressId } from '../../utils/validation/dressValidation';

async function getPublicIncidentsByDressId(req: Request, res: Response): Promise<void> {
	const dressId = parseDressId(req.params.id as string);

	logger.info(`Getting public damage incidents for dress '${dressId}'`);

	try {
		const incidents = await dressDamageIncidentRepository.getPublicIncidentsByDressId(dressId);

		res.status(200).json(incidents);
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error getting public damage incidents for dress '${dressId}': ${error.message}`);
		throw new AppError(500, 'Unable to load damage history. Please try again.');
	}
}

export default getPublicIncidentsByDressId;
