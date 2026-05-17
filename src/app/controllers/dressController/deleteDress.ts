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

	let dressPhotoUrl: string | null = null;

	await withTransaction(
		async (connection) => {
			await verifyDressOwnership(vehicleId, currentUserId, connection);

			// Fetch dress data to get image URL before deletion
			const dress = await dressRepository.getDressById(
				vehicleId,
				connection
			);

			if (!dress) {
				throw new AppError(404, 'Dress not found');
			}

			dressPhotoUrl = dress.dressPhotoUrl;
			logger.info(
				`Dress has image URL: ${dressPhotoUrl ? 'yes' : 'no'}`
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

	// Delete image from R2 after successful database deletion
	if (dressPhotoUrl) {
		try {
			const key = extractKeyFromUrl(dressPhotoUrl);

			if (key) {
				logger.info(`Deleting dress image from R2 storage: ${key}`);
				await deleteFileFromR2(key);
				logger.info(
					'Successfully deleted dress image from R2 storage'
				);
			}
		} catch (r2Error) {
			// Log error but don't fail the request since DB deletion succeeded
			const errorMessage =
				r2Error instanceof Error ? r2Error.message : 'Unknown error';
			logger.error(
				`Failed to delete dress image from R2: ${errorMessage}`
			);
			logger.warn(
				'Dress deleted from database but image remains in R2 storage'
			);
		}
	}
}

export default deleteDress;
