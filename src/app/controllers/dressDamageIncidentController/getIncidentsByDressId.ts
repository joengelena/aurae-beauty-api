import { Request, Response } from 'express';
import * as dressDamageIncidentRepository from '../../repositories/dressDamageIncidentRepository/dressDamageIncidentRepository';
import logger from '../../../config/logger';
import { parseDressId, verifyDressOwnership } from '../../utils/validation/dressValidation';

async function getIncidentsByDressId(req: Request, res: Response): Promise<void> {
	const dressId = parseDressId(req.params.id as string);
	const userId = req.body.currentUserId;

	logger.info(`Getting damage incidents for dress '${dressId}'`);

	await verifyDressOwnership(dressId, userId);

	const incidents = await dressDamageIncidentRepository.getIncidentsByDressId(dressId);

	res.status(200).send(incidents);
}

export default getIncidentsByDressId;
