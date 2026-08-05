import { Request, Response } from 'express';
import * as dressDamageIncidentRepository from '../../repositories/dressDamageIncidentRepository/dressDamageIncidentRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import uploadImages from '../../utils/cloudflare/uploadImages';
import { validateFile } from '../../utils/cloudflare/validation';
import { parseDressId, verifyDressOwnership } from '../../utils/validation/dressValidation';
import { withTransaction } from '../../utils/database/transactionHandler';
import { extractKeyFromUrl, deleteFileFromR2 } from '../../utils/cloudflare/r2Client';

async function patchIncident(req: Request, res: Response): Promise<void> {
	const dressId = parseDressId(req.params.id as string);
	const incidentId = parseInt(req.params.incidentId as string, 10);

	if (isNaN(incidentId)) {
		throw new AppError(400, 'Invalid damage incident ID');
	}

	const { currentUserId, keepPhotoUrls: keepPhotoUrlsStr, resolved, ...updateFields } = req.body;

	logger.info(`Updating damage incident '${incidentId}' for dress '${dressId}'`);

	const files = (req.files || []) as Express.Multer.File[];
	const keepPhotoUrls: string[] = keepPhotoUrlsStr
		? JSON.parse(keepPhotoUrlsStr as string)
		: [];
	const hasPhotoChanges = files.length > 0 || keepPhotoUrlsStr !== undefined;

	let newlyUploadedUrls: string[] = [];
	if (files.length > 0) {
		if (files.length > 5) {
			throw new AppError(400, 'Too many files. Maximum allowed: 5');
		}
		for (const file of files) {
			validateFile(file);
		}
		const uploadResult = await uploadImages(files);
		newlyUploadedUrls = uploadResult.urls;
	}

	if (hasPhotoChanges) {
		updateFields.photoUrls = [...keepPhotoUrls, ...newlyUploadedUrls];
	}

	if (resolved !== undefined) {
		updateFields.resolved = resolved;
		// Resolution date is server-computed, not client-trusted, to avoid clock skew.
		updateFields.resolvedAt = resolved ? new Date().toISOString().substring(0, 10) : null;
	}

	if (Object.keys(updateFields).length === 0) {
		res.status(200).send({ message: 'Damage incident updated successfully' });
		return;
	}

	let urlsToDelete: string[] = [];

	await withTransaction(
		async (connection) => {
			await verifyDressOwnership(dressId, currentUserId, connection);

			const incident = await dressDamageIncidentRepository.getIncidentById(incidentId, connection);
			if (!incident || incident.dressIdFk !== dressId) {
				throw new AppError(404, 'Damage incident not found');
			}

			if (hasPhotoChanges) {
				urlsToDelete = (incident.photoUrls ?? []).filter((url) => !keepPhotoUrls.includes(url));
			}

			const result = await dressDamageIncidentRepository.updateIncidentById(
				incidentId,
				updateFields,
				connection
			);

			if (result.rowCount !== 1) {
				throw new AppError(500, 'Unable to update damage incident. Please try again.');
			}

			res.status(200).send({ message: 'Damage incident updated successfully' });
		},
		res,
		'update damage incident'
	);

	for (const url of urlsToDelete) {
		try {
			const key = extractKeyFromUrl(url);
			if (key) {
				await deleteFileFromR2(key);
			}
		} catch (r2Error) {
			const msg = r2Error instanceof Error ? r2Error.message : 'Unknown error';
			logger.error(`Failed to delete damage incident photo from R2: ${msg}`);
		}
	}
}

export default patchIncident;
