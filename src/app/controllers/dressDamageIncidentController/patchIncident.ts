import { Request, Response } from 'express';
import * as dressDamageIncidentRepository from '../../repositories/dressDamageIncidentRepository/dressDamageIncidentRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import uploadImages from '../../utils/cloudflare/uploadImages';
import { validateFile } from '../../utils/cloudflare/validation';
import { parseDressId, verifyDressOwnership } from '../../utils/validation/dressValidation';
import { parsePositiveIntId } from '../../utils/validation/idValidation';
import { parseStringArrayField } from '../../utils/validation/multipartFieldParser';
import { withTransaction } from '../../utils/database/transactionHandler';
import { deleteR2KeysBestEffort, deleteR2UrlsBestEffort } from '../../utils/cloudflare/cleanup';

const MAX_INCIDENT_PHOTOS_PER_REQUEST = 5;

async function patchIncident(req: Request, res: Response): Promise<void> {
	const dressId = parseDressId(req.params.id as string);
	const incidentId = parsePositiveIntId(req.params.incidentId as string, 'damage incident ID');

	const { currentUserId, keepPhotoUrls: keepPhotoUrlsStr, resolved, ...updateFields } = req.body;

	logger.info(`Updating damage incident '${incidentId}' for dress '${dressId}'`);

	const files = (req.files || []) as Express.Multer.File[];

	// Parse and validate before anything touches R2.
	// An empty keepPhotoUrls string keeps its old meaning: "keep none".
	const requestedKeepUrls: string[] =
		keepPhotoUrlsStr !== undefined && keepPhotoUrlsStr !== ''
			? parseStringArrayField(keepPhotoUrlsStr, 'keepPhotoUrls')
			: [];
	const hasPhotoChanges = files.length > 0 || keepPhotoUrlsStr !== undefined;

	if (resolved !== undefined) {
		updateFields.resolved = resolved;
		// Resolution date is server-computed, not client-trusted, to avoid clock skew.
		updateFields.resolvedAt = resolved ? new Date().toISOString().substring(0, 10) : null;
	}

	if (!hasPhotoChanges && Object.keys(updateFields).length === 0) {
		res.status(200).send({ message: 'Damage incident updated successfully' });
		return;
	}

	if (files.length > MAX_INCIDENT_PHOTOS_PER_REQUEST) {
		throw new AppError(400, `Too many files. Maximum allowed: ${MAX_INCIDENT_PHOTOS_PER_REQUEST}`);
	}
	for (const file of files) {
		validateFile(file);
	}

	// Ownership and existence checks before upload; re-checked in the transaction.
	await verifyDressOwnership(dressId, currentUserId);
	const existingIncident = await dressDamageIncidentRepository.getIncidentById(incidentId);
	if (!existingIncident || existingIncident.dressIdFk !== dressId) {
		throw new AppError(404, 'Damage incident not found');
	}

	let newlyUploadedUrls: string[] = [];
	let newlyUploadedKeys: string[] = [];
	if (files.length > 0) {
		try {
			const uploadResult = await uploadImages(files);
			newlyUploadedUrls = uploadResult.urls;
			newlyUploadedKeys = uploadResult.keys;
		} catch (uploadError: any) {
			logger.error(`Failed to upload damage incident photos: ${uploadError.message}`);
			throw new AppError(500, 'Unable to upload photos. Please try again.');
		}
	}

	let urlsToDelete: string[] = [];

	try {
		await withTransaction(
			async (connection) => {
				await verifyDressOwnership(dressId, currentUserId, connection);

				const incident = await dressDamageIncidentRepository.getIncidentById(incidentId, connection);
				if (!incident || incident.dressIdFk !== dressId) {
					throw new AppError(404, 'Damage incident not found');
				}

				if (hasPhotoChanges) {
					const oldUrls = incident.photoUrls ?? [];

					// Only URLs this incident already has can be kept; unknown URLs
					// are ignored so a client can't attach another user's R2 object.
					const keptUrls = Array.from(
						new Set(requestedKeepUrls.filter((url) => oldUrls.includes(url)))
					);
					if (keptUrls.length !== new Set(requestedKeepUrls).size) {
						logger.warn(
							`Ignored ${new Set(requestedKeepUrls).size - keptUrls.length} unknown keepPhotoUrls for damage incident '${incidentId}' from user '${currentUserId}'`
						);
					}

					updateFields.photoUrls = [...keptUrls, ...newlyUploadedUrls];
					urlsToDelete = oldUrls.filter((url) => !keptUrls.includes(url));
				}

				const result = await dressDamageIncidentRepository.updateIncidentById(
					incidentId,
					updateFields,
					connection
				);

				if (result.rowCount !== 1) {
					throw new AppError(500, 'Unable to update damage incident. Please try again.');
				}
			},
			res,
			'update damage incident'
		);
	} catch (error) {
		// The update never committed: drop the photos uploaded for it
		await deleteR2KeysBestEffort(newlyUploadedKeys, `roll back photos for damage incident '${incidentId}'`);
		throw error;
	}

	res.status(200).send({ message: 'Damage incident updated successfully' });

	await deleteR2UrlsBestEffort(urlsToDelete, `removed photos of damage incident '${incidentId}'`);
}

export default patchIncident;
