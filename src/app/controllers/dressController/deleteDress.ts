import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import * as dressDamageIncidentRepository from '../../repositories/dressDamageIncidentRepository/dressDamageIncidentRepository';
import AppError from '../../utils/errors/appError';
import {
	parseDressId,
	verifyDressOwnership,
} from '../../utils/validation/dressValidation';
import { withTransaction } from '../../utils/database/transactionHandler';
import { deleteR2UrlsBestEffort } from '../../utils/cloudflare/cleanup';

async function deleteDress(req: Request, res: Response): Promise<void> {
	const vehicleId = parseDressId(req.params.id as string);
	const currentUserId = req.body.currentUserId;

	logger.info(`Deleting dress with id '${vehicleId}'`);

	let imageUrlsToDelete: string[] = [];

	await withTransaction(
		async (connection) => {
			await verifyDressOwnership(vehicleId, currentUserId, connection);

			// Fetch dress data to get image URLs before deletion
			const dress = await dressRepository.getDressById(
				vehicleId,
				connection
			);

			if (!dress) {
				throw new AppError(404, 'Dress not found');
			}

			// Damage incidents cascade-delete with the dress, so their photos
			// have to be collected now as well.
			const incidents = await dressDamageIncidentRepository.getIncidentsByDressId(
				vehicleId,
				connection
			);
			const incidentPhotoUrls = incidents.flatMap((incident) => incident.photoUrls ?? []);

			imageUrlsToDelete = [...(dress.dressPhotoUrls ?? []), ...incidentPhotoUrls];
			logger.info(
				`Dress has ${imageUrlsToDelete.length} image(s) to delete (including damage incident photos)`
			);

			const result = await dressRepository.deleteDressById(
				vehicleId,
				connection
			);

			if (result.rowCount === 0) {
				throw new AppError(404, 'Dress not found');
			}
		},
		res,
		'delete dress'
	);

	res.status(200).send({
		message: 'Dress deleted successfully',
	});

	// Delete photos from R2 only after the database deletion has committed
	await deleteR2UrlsBestEffort(imageUrlsToDelete, `photos of deleted dress '${vehicleId}'`);
}

export default deleteDress;
