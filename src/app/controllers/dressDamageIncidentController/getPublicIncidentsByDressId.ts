import { Request, Response } from 'express';
import * as dressDamageIncidentRepository from '../../repositories/dressDamageIncidentRepository/dressDamageIncidentRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

async function getPublicIncidentsByDressId(req: Request, res: Response): Promise<void> {
	const dressId = parseInt(req.params.id as string, 10);

	if (isNaN(dressId)) {
		throw new AppError(400, 'Invalid dress ID');
	}

	logger.info(`Getting public damage incidents for dress '${dressId}'`);

	const incidents = await dressDamageIncidentRepository.getPublicIncidentsByDressId(dressId);

	res.status(200).json(incidents);
}

export default getPublicIncidentsByDressId;
