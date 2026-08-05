import { Request, Response } from 'express';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import { parseBusinessId, verifyBusinessRole } from '../../utils/validation/businessValidation';

async function getBusinessMembers(req: Request, res: Response): Promise<void> {
	const businessId = parseBusinessId(req.params.businessId as string);
	const currentUserId = req.body.currentUserId;

	try {
		await verifyBusinessRole(businessId, currentUserId, ['owner']);

		const members = await businessRepository.getBusinessMembers(businessId);

		res.status(200).send(members);
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error getting business members: ${error.message}`);
		throw new AppError(500, 'Unable to load business members. Please try again.');
	}
}

export default getBusinessMembers;
