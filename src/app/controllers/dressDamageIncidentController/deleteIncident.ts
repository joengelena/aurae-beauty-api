import { Request, Response } from 'express';
import * as dressDamageIncidentRepository from '../../repositories/dressDamageIncidentRepository/dressDamageIncidentRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { getPool } from '../../../config/db';
import { parseDressId, verifyDressOwnership } from '../../utils/validation/dressValidation';
import { extractKeyFromUrl, deleteMultipleFilesFromR2 } from '../../utils/cloudflare/r2Client';

async function deleteIncident(req: Request, res: Response): Promise<void> {
	const dressId = parseDressId(req.params.id as string);
	const incidentId = parseInt(req.params.incidentId as string, 10);
	const userId = req.body.currentUserId;

	if (isNaN(incidentId)) {
		throw new AppError(400, 'Invalid damage incident ID');
	}

	logger.info(`Deleting damage incident '${incidentId}' for dress '${dressId}'`);

	const connection = await getPool().connect();
	let photoUrls: string[] = [];

	try {
		await connection.query('BEGIN');

		await verifyDressOwnership(dressId, userId, connection);

		const incident = await dressDamageIncidentRepository.getIncidentById(incidentId, connection);
		if (!incident || incident.dressIdFk !== dressId) {
			throw new AppError(404, 'Damage incident not found');
		}
		photoUrls = incident.photoUrls ?? [];

		await dressDamageIncidentRepository.deleteIncidentById(incidentId, connection);

		await connection.query('COMMIT');
		connection.release();

		logger.info(`Damage incident '${incidentId}' deleted successfully by user '${userId}'`);

		res.status(200).send({ message: 'Damage incident deleted successfully' });
	} catch (error: any) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during delete damage incident: ${error.message}`);
		throw new AppError(500, 'Unable to delete damage incident. Please try again.');
	}

	if (photoUrls.length > 0) {
		const keys = photoUrls.map(extractKeyFromUrl).filter((key): key is string => !!key);
		if (keys.length > 0) {
			await deleteMultipleFilesFromR2(keys).catch((r2Error) => {
				const msg = r2Error instanceof Error ? r2Error.message : 'Unknown error';
				logger.error(`Failed to delete damage incident photos from R2: ${msg}`);
			});
		}
	}
}

export default deleteIncident;
