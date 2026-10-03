import { Request, Response } from 'express';
import * as dressDamageIncidentRepository from '../../repositories/dressDamageIncidentRepository/dressDamageIncidentRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { DressDamageIncident } from '../../resources/types';
import { getPool } from '../../../config/db';
import uploadImages from '../../utils/cloudflare/uploadImages';
import { validateFiles } from '../../utils/cloudflare/validation';
import { deleteMultipleFilesFromR2 } from '../../utils/cloudflare/r2Client';
import { parseDressId, verifyDressOwnership } from '../../utils/validation/dressValidation';
import * as rentalBookingRepository from '../../repositories/rentalBookingRepository/dressBookingRepository';
import { todayInBookingTimeZone } from '../rentalBookingController/bookingDates';

async function postIncident(req: Request, res: Response): Promise<void> {
	const dressId = parseDressId(req.params.id as string);
	const userId = req.body.currentUserId;
	const { bookingIdFk, description, occurredAt, isPublic } = req.body;

	logger.info(`Adding damage incident for dress '${dressId}'`);

	const files = (req.files || []) as Express.Multer.File[];
	let photoUrls: string[] = [];
	let uploadedKeys: string[] = [];

	if (files.length > 0) {
		validateFiles(files);
		// Ownership check before upload (re-checked in the transaction below)
		await verifyDressOwnership(dressId, userId);
		const uploadResult = await uploadImages(files);
		photoUrls = uploadResult.urls;
		uploadedKeys = uploadResult.keys;
	}

	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');

		await verifyDressOwnership(dressId, userId, connection);

		// An incident can only point at a booking of this same dress. Owning
		// the dress doesn't entitle you to another boutique's booking.
		if (bookingIdFk !== undefined && bookingIdFk !== null) {
			const booking = await rentalBookingRepository.getServiceById(bookingIdFk, connection);
			if (!booking || booking.dressIdFk !== dressId) {
				throw new AppError(400, 'That booking is not for this dress');
			}
		}

		const incidentData: Omit<DressDamageIncident, 'id' | 'createdAt' | 'updatedAt'> = {
			dressIdFk: dressId,
			bookingIdFk: bookingIdFk ?? null,
			description,
			photoUrls,
			// Today in New Zealand, not UTC: before 1pm NZDT the UTC date is still yesterday.
			occurredAt: occurredAt ?? todayInBookingTimeZone(),
			isPublic: isPublic ?? false,
			resolved: false,
			resolutionNotes: null,
			resolvedAt: null,
		};

		const result = await dressDamageIncidentRepository.postIncident(incidentData, connection);

		await connection.query('COMMIT');
		connection.release();

		logger.info(`Damage incident created for dress '${dressId}' by user '${userId}'`);

		res.status(201).send({
			message: 'Damage incident added successfully',
			incidentId: result.rows[0]?.id,
		});
	} catch (error: any) {
		await connection.query('ROLLBACK');
		connection.release();

		if (uploadedKeys.length > 0) {
			try {
				await deleteMultipleFilesFromR2(uploadedKeys);
			} catch (r2Error) {
				const msg = r2Error instanceof Error ? r2Error.message : 'Unknown error';
				logger.error(`Failed to roll back damage incident photos from R2: ${msg}`);
			}
		}

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during damage incident creation: ${error.message}`);
		throw new AppError(500, 'Unable to add damage incident. Please try again.');
	}
}

export default postIncident;
