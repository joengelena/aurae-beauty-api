import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import AppError from '../../utils/errors/appError';
import {
	parseDressId,
	verifyDressOwnership,
} from '../../utils/validation/dressValidation';
import { withTransaction } from '../../utils/database/transactionHandler';
import {
	extractKeyFromUrl,
	deleteFileFromR2,
} from '../../utils/cloudflare/r2Client';

async function deleteDress(req: Request, res: Response): Promise<void> {
	const vehicleId = parseDressId(req.params.id as string);
	const currentUserId = req.body.currentUserId;

	logger.info(`Deleting dress with id '${vehicleId}'`);

	let dressPhotoUrls: string[] = [];

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

			dressPhotoUrls = dress.dressPhotoUrls ?? [];
			logger.info(
				`Dress has ${dressPhotoUrls.length} image(s) to delete`
			);

			const result = await dressRepository.deleteDressById(
				vehicleId,
				connection
			);

			if (result.rowCount === 0) {
				throw new AppError(404, 'Dress not found');
			}

			res.status(200).send({
				message: 'Dress deleted successfully',
			});
		},
		res,
		'delete dress'
	);

	// Delete photos from R2 after successful database deletion
	for (const url of dressPhotoUrls) {
		try {
			const key = extractKeyFromUrl(url);
			if (key) {
				logger.info(`Deleting dress photo from R2: ${key}`);
				await deleteFileFromR2(key);
			}
		} catch (r2Error) {
			const errorMessage =
				r2Error instanceof Error ? r2Error.message : 'Unknown error';
			logger.error(`Failed to delete dress photo from R2: ${errorMessage}`);
			logger.warn('Dress deleted from database but photo remains in R2 storage');
		}
	}
}

export default deleteDress;
