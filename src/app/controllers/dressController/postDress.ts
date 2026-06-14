import { Request, Response } from 'express';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { UserDress } from '../../resources/types';
import { getPool } from '../../../config/db';
import { uploadSingleImage } from '../../utils/cloudflare/uploadImages';
import { validateFile } from '../../utils/cloudflare/validation';

async function postDress(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	const {
		name,
		brand,
		style,
		listingType,
		isPublic,
		size,
		condition,
		purchaseYear,
		internalName,
		color,
		rentalCount,
		rentalPricePerDay,
		purchasePrice,
		notes,
		damageDescription,
	} = req.body;

	logger.info(`Creating new dress for user '${userId}'`);

	const file = req.file as Express.Multer.File | undefined;

	let dressPhotoUrl: string | null = null;
	if (file) {
		validateFile(file);
		logger.info(
			`Uploading dress image: ${file.originalname} (${file.size} bytes)`
		);
		const uploadResult = await uploadSingleImage(file);
		dressPhotoUrl = uploadResult.url;
		logger.info(`Successfully uploaded dress image: ${uploadResult.key}`);
	}

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		const dressData: Omit<UserDress, 'id' | 'createdAt' | 'updatedAt'> = {
			userIdFk: userId,
			name: name ?? null,
			brand,
			style,
			listingType: listingType ?? 'rent',
			isPublic: isPublic ?? false,
			size: size ?? null,
			condition: condition ?? null,
			purchaseYear: purchaseYear ?? null,
			internalName: internalName ?? null,
			color: color ?? null,
			rentalCount: rentalCount ?? null,
			rentalPricePerDay: rentalPricePerDay ?? null,
			purchasePrice: purchasePrice ?? null,
			dressPhotoUrl,
			notes: notes ?? null,
			damageDescription: damageDescription ?? null,
			damagePhotoUrls: null,
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
