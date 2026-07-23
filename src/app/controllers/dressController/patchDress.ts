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
import { withTransaction } from '../../utils/database/transactionHandler';
import {
	extractKeyFromUrl,
	deleteFileFromR2,
} from '../../utils/cloudflare/r2Client';

async function patchDress(req: Request, res: Response): Promise<void> {
	const vehicleId = parseDressId(req.params.id as string);
	const { currentUserId, keepPhotoUrls: keepPhotoUrlsStr, blockedDateRanges: blockedDateRangesStr, recommendedSizes: recommendedSizesStr, ...newVehicleData } = req.body;

	logger.info(`Updating dress with id '${vehicleId}'`);

	const files = (req.files || []) as Express.Multer.File[];
	const keepPhotoUrls: string[] = keepPhotoUrlsStr
		? JSON.parse(keepPhotoUrlsStr as string)
		: [];
	const hasPhotoChanges = files.length > 0 || keepPhotoUrlsStr !== undefined;

	// Upload new photos if provided
	let newlyUploadedUrls: string[] = [];
	if (files.length > 0) {
		if (files.length > 10) {
			throw new AppError(400, 'Too many files. Maximum allowed: 10');
		}
		for (const file of files) {
			validateFile(file);
		}
		logger.info(`Uploading ${files.length} new dress photo(s)`);
		const uploadResult = await uploadImages(files);
		newlyUploadedUrls = uploadResult.urls;
		logger.info(`Successfully uploaded ${files.length} dress photo(s)`);
	}

	// Combine kept existing URLs + newly uploaded
	if (hasPhotoChanges) {
		newVehicleData.dressPhotoUrls = [...keepPhotoUrls, ...newlyUploadedUrls];
	}

	if (blockedDateRangesStr !== undefined) {
		newVehicleData.blockedDateRanges = JSON.parse(blockedDateRangesStr as string);
	}

	if (recommendedSizesStr !== undefined) {
		newVehicleData.recommendedSizes = JSON.parse(recommendedSizesStr as string);
	}

	if (Object.keys(newVehicleData).length === 0) {
		res.status(200).send({ message: 'Dress updated successfully' });
		return;
	}

	let urlsToDelete: string[] = [];

	await withTransaction(
		async (connection) => {
			await verifyDressOwnership(vehicleId, currentUserId, connection);

			// Find which old photos were removed so we can delete from R2
			if (hasPhotoChanges) {
				const dress = await dressRepository.getDressById(vehicleId, connection);
				if (!dress) throw new AppError(404, 'Dress not found');

				const oldUrls = dress.dressPhotoUrls ?? [];
				urlsToDelete = oldUrls.filter((url: string) => !keepPhotoUrls.includes(url));
			}

			const result = await dressRepository.updateDressById(
				vehicleId,
				newVehicleData,
				connection
			);

			if (result.rowCount !== 1) {
				throw new AppError(500, 'Unable to update dress. Please try again.');
			}

			res.status(200).send({ message: 'Dress updated successfully' });
		},
		res,
		'update dress'
	);

	// Delete removed photos from R2 after successful DB update
	for (const url of urlsToDelete) {
		try {
			const key = extractKeyFromUrl(url);
			if (key) {
				await deleteFileFromR2(key);
				logger.info(`Deleted removed dress photo from R2: ${key}`);
			}
		} catch (r2Error) {
			const msg = r2Error instanceof Error ? r2Error.message : 'Unknown error';
			logger.error(`Failed to delete dress photo from R2: ${msg}`);
		}
	}
}

export default patchDress;
