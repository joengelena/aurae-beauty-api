import { Request, Response } from 'express';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import { withTransaction } from '../../utils/database/transactionHandler';

async function postBusiness(req: Request, res: Response): Promise<void> {
	const { currentUserId, name } = req.body;

	logger.info(`Creating business '${name}' for user '${currentUserId}'`);

	const createdBusiness = await withTransaction(
		async (connection) => {
			const existingMembership = await businessRepository.getMembershipForUser(
				currentUserId,
				connection
			);

			if (existingMembership) {
				throw new AppError(409, 'You already belong to a business');
			}

			const business = await businessRepository.createBusiness(
				name,
				currentUserId,
				connection
			);
			await businessRepository.addMember(business.id, currentUserId, 'owner', connection);

			return business;
		},
		res,
		'create business'
	);

	// Only after COMMIT: the client immediately reloads its profile and must
	// see the new membership.
	res.status(201).send({
		message: 'Business created successfully',
		business: createdBusiness,
	});
}

export default postBusiness;
