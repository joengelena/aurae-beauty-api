import { Request, Response } from 'express';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import { parseDressId } from '../../utils/validation/dressValidation';

async function getDressById(req: Request, res: Response): Promise<void> {
	const userId = req.body.currentUserId;
	// Validate vehicleId BEFORE logging to avoid logging invalid data
	const vehicleId = parseDressId(req.params.id as string);

	logger.info(`Getting dress with id '${vehicleId}' for user '${userId}'`);

	try {
		const ownerUserId = await businessRepository.resolveOwnerUserIdForMember(userId);

		if (!ownerUserId) {
			throw new AppError(403, "You don't belong to a business");
		}

		const dress = await dressRepository.getDressByIdAndUserId(
			vehicleId,
			ownerUserId
		);

		if (!dress) {
			throw new AppError(404, 'Dress not found');
		}
		res.status(200).send(dress);
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(
			`Unexpected error during get dress by id: ${error.message}`
		);
		throw new AppError(500, 'Unable to load dress. Please try again.');
	}
}

export default getDressById;
