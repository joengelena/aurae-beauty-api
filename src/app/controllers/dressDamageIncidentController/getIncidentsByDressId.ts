import { Request, Response } from 'express';
import * as dressDamageIncidentRepository from '../../repositories/dressDamageIncidentRepository/dressDamageIncidentRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { parseDressId, verifyDressOwnership } from '../../utils/validation/dressValidation';

async function getIncidentsByDressId(req: Request, res: Response): Promise<void> {
	const dressId = parseDressId(req.params.id as string);
	const userId = req.body.currentUserId;

	logger.info(`Getting damage incidents for dress '${dressId}'`);

	try {
		await verifyDressOwnership(dressId, userId);

		const incidents = await dressDamageIncidentRepository.getIncidentsByDressId(dressId);

		res.status(200).send(incidents);
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error getting damage incidents for dress '${dressId}': ${error.message}`);
		throw new AppError(500, 'Unable to load damage history. Please try again.');
	}
}

export default getIncidentsByDressId;
