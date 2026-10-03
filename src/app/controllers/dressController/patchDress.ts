import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import AppError from '../../utils/errors/appError';
import uploadImages from '../../utils/cloudflare/uploadImages';
import { validateFile } from '../../utils/cloudflare/validation';
import {
	parseDressId,
	verifyDressOwnership,
} from '../../utils/validation/dressValidation';
import {
	parseStringArrayField,
	parseDateRangeArrayField,
} from '../../utils/validation/multipartFieldParser';
import { withTransaction } from '../../utils/database/transactionHandler';
import {
	deleteR2KeysBestEffort,
	deleteR2UrlsBestEffort,
} from '../../utils/cloudflare/cleanup';

const MAX_DRESS_PHOTOS_PER_REQUEST = 10;

async function patchDress(req: Request, res: Response): Promise<void> {
	const dressId = parseDressId(req.params.id as string);
	const { currentUserId, keepPhotoUrls: keepPhotoUrlsStr, blockedDateRanges: blockedDateRangesStr, recommendedSizes: recommendedSizesStr, ...newDressData } = req.body;

	logger.info(`Updating dress with id '${dressId}'`);

	const files = (req.files || []) as Express.Multer.File[];

	// Parse and validate every multipart JSON field before anything touches R2.
	// An empty keepPhotoUrls string keeps its old meaning: "keep none".
	const requestedKeepUrls: string[] =
		keepPhotoUrlsStr !== undefined && keepPhotoUrlsStr !== ''
			? parseStringArrayField(keepPhotoUrlsStr, 'keepPhotoUrls')
			: [];
	const hasPhotoChanges = files.length > 0 || keepPhotoUrlsStr !== undefined;

	if (blockedDateRangesStr !== undefined) {
		newDressData.blockedDateRanges = parseDateRangeArrayField(blockedDateRangesStr, 'blockedDateRanges');
	}

	if (recommendedSizesStr !== undefined) {
		newDressData.recommendedSizes = parseStringArrayField(recommendedSizesStr, 'recommendedSizes');
	}

	if (!hasPhotoChanges && Object.keys(newDressData).length === 0) {
		res.status(200).send({ message: 'Dress updated successfully' });
		return;
	}

	if (files.length > MAX_DRESS_PHOTOS_PER_REQUEST) {
		throw new AppError(400, `Too many files. Maximum allowed: ${MAX_DRESS_PHOTOS_PER_REQUEST}`);
	}
	for (const file of files) {
		validateFile(file);
	}

	// Ownership check before upload, so a caller can't make the server store
	// files against a dress they don't own. Re-checked inside the transaction.
	await verifyDressOwnership(dressId, currentUserId);

	let newlyUploadedUrls: string[] = [];
	let newlyUploadedKeys: string[] = [];
	if (files.length > 0) {
		logger.info(`Uploading ${files.length} new dress photo(s)`);
		try {
			const uploadResult = await uploadImages(files);
			newlyUploadedUrls = uploadResult.urls;
			newlyUploadedKeys = uploadResult.keys;
		} catch (uploadError: any) {
			logger.error(`Failed to upload dress photos: ${uploadError.message}`);
			throw new AppError(500, 'Unable to upload photos. Please try again.');
		}
		logger.info(`Successfully uploaded ${files.length} dress photo(s)`);
	}

	let urlsToDelete: string[] = [];

	try {
		await withTransaction(
			async (connection) => {
				await verifyDressOwnership(dressId, currentUserId, connection);

				if (hasPhotoChanges) {
					const dress = await dressRepository.getDressById(dressId, connection);
					if (!dress) throw new AppError(404, 'Dress not found');

					const oldUrls = dress.dressPhotoUrls ?? [];

					// Only URLs this dress already has can be kept. Anything else is
					// ignored, so a client can't attach (and later get the server to
					// delete) another user's R2 object.
					const keptUrls = Array.from(
						new Set(requestedKeepUrls.filter((url) => oldUrls.includes(url)))
					);
					if (keptUrls.length !== new Set(requestedKeepUrls).size) {
						logger.warn(
							`Ignored ${new Set(requestedKeepUrls).size - keptUrls.length} unknown keepPhotoUrls for dress '${dressId}' from user '${currentUserId}'`
						);
					}

					newDressData.dressPhotoUrls = [...keptUrls, ...newlyUploadedUrls];
					urlsToDelete = oldUrls.filter((url: string) => !keptUrls.includes(url));
				}

				const result = await dressRepository.updateDressById(
					dressId,
					newDressData,
					connection
				);

				if (result.rowCount !== 1) {
					throw new AppError(500, 'Unable to update dress. Please try again.');
				}
			},
			res,
			'update dress'
		);
	} catch (error) {
		// The update never committed: drop the photos uploaded for it
		await deleteR2KeysBestEffort(newlyUploadedKeys, `roll back photos for dress '${dressId}'`);
		throw error;
	}

	res.status(200).send({ message: 'Dress updated successfully' });

	// Delete removed photos from R2 after successful DB update
	await deleteR2UrlsBestEffort(urlsToDelete, `removed photos of dress '${dressId}'`);
}

export default patchDress;
