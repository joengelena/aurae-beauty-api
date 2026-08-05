import { Request, Response } from 'express';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { UserDress } from '../../resources/types';
import { getPool } from '../../../config/db';
import uploadImages from '../../utils/cloudflare/uploadImages';
import { validateFiles } from '../../utils/cloudflare/validation';

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
	let dressPhotoUrls: string[] = [];

	if (files.length > 0) {
		validateFiles(files);
		logger.info(`Uploading ${files.length} dress photo(s)`);
		const uploadResult = await uploadImages(files);
		dressPhotoUrls = uploadResult.urls;
		logger.info(`Successfully uploaded ${files.length} dress photo(s)`);
	}

	const connection = await getPool().connect();

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
			isPublic: isPublic ?? false,
			size: size ?? null,
			fitNote: fitNote ?? null,
			recommendedSizes: recommendedSizes ? JSON.parse(recommendedSizes) : [],
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
		await connection.query('ROLLBACK');
		connection.release();

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
