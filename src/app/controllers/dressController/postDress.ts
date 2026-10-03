import { Request, Response } from 'express';
import { PoolClient } from 'pg';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { UserDress } from '../../resources/types';
import { getPool } from '../../../config/db';
import uploadImages from '../../utils/cloudflare/uploadImages';
import { validateFiles } from '../../utils/cloudflare/validation';
import { deleteR2KeysBestEffort } from '../../utils/cloudflare/cleanup';
import { parseStringArrayField } from '../../utils/validation/multipartFieldParser';

async function postDress(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const {
		name,
		brand,
		style,
		dressType,
		listingType,
		isPublic,
		size,
		fitNote,
		recommendedSizes,
		condition,
		purchaseYear,
		internalName,
		color,
		rentalCount,
		rentalPricePerDay,
		purchasePrice,
		availableFrom,
		notes,
	} = req.body;

	logger.info(`Creating new dress for user '${userId}'`);

	const files = (req.files || []) as Express.Multer.File[];

	// Parse and validate everything we can before touching R2
	const parsedRecommendedSizes: string[] =
		recommendedSizes !== undefined && recommendedSizes !== ''
			? parseStringArrayField(recommendedSizes, 'recommendedSizes')
			: [];

	if (files.length > 0) {
		validateFiles(files);
	}

	// Membership check before upload so a caller without a business can't
	// make the server upload files it will never use.
	const callerOwnerUserId = await businessRepository.resolveOwnerUserIdForMember(userId);
	if (!callerOwnerUserId) {
		throw new AppError(403, "You don't belong to a business");
	}

	let dressPhotoUrls: string[] = [];
	let uploadedKeys: string[] = [];

	if (files.length > 0) {
		logger.info(`Uploading ${files.length} dress photo(s)`);
		try {
			const uploadResult = await uploadImages(files);
			dressPhotoUrls = uploadResult.urls;
			uploadedKeys = uploadResult.keys;
		} catch (uploadError: any) {
			logger.error(`Failed to upload dress photos: ${uploadError.message}`);
			throw new AppError(500, 'Unable to upload photos. Please try again.');
		}
		logger.info(`Successfully uploaded ${files.length} dress photo(s)`);
	}

	let connection: PoolClient;
	try {
		connection = await getPool().connect();
	} catch (connectError: any) {
		await deleteR2KeysBestEffort(uploadedKeys, 'roll back dress photos');
		logger.error(`Failed to acquire DB connection for dress creation: ${connectError.message}`);
		throw new AppError(500, 'Unable to create dress. Please try again.');
	}

	try {
		await connection.query('BEGIN');

		const ownerUserId = await businessRepository.resolveOwnerUserIdForMember(
			userId,
			connection
		);

		if (!ownerUserId) {
			throw new AppError(403, "You don't belong to a business");
		}

		const dressData: Omit<UserDress, 'id' | 'createdAt' | 'updatedAt'> = {
			userIdFk: ownerUserId,
			name: name ?? null,
			brand,
			style,
			dressType: dressType ?? null,
			listingType: listingType ?? 'rent',
			status: 'active',
			isPublic: isPublic ?? false,
			size: size ?? null,
			fitNote: fitNote ?? null,
			recommendedSizes: parsedRecommendedSizes,
			condition: condition ?? null,
			purchaseYear: purchaseYear ?? null,
			internalName: internalName ?? null,
			color: color ?? null,
			rentalCount: rentalCount ?? null,
			rentalPricePerDay: rentalPricePerDay ?? null,
			purchasePrice: purchasePrice ?? null,
			availableFrom: availableFrom ?? null,
			dressPhotoUrls,
			notes: notes ?? null,
		};

		const result = await dressRepository.postDress(dressData, connection);

		const dressId = result.rows[0].id;

		logger.info(`Dress created with id '${dressId}' for user '${userId}'`);

		const createdDress = await dressRepository.getDressById(dressId, connection);

		await connection.query('COMMIT');
		connection.release();

		res.status(201).send({
			message: 'Dress created successfully',
			dress: createdDress,
		});
	} catch (error: any) {
		await connection.query('ROLLBACK').catch((rollbackError: any) => {
			logger.error(`Failed to roll back dress creation: ${rollbackError.message}`);
		});
		connection.release();

		// The dress row never committed, so its photos must not stay in R2
		await deleteR2KeysBestEffort(uploadedKeys, 'roll back dress photos');

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(
			`Unexpected error during dress creation: ${error.message}`
		);
		throw new AppError(500, 'Unable to create dress. Please try again.');
	}
}

export default postDress;
