import { Request, Response } from 'express';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import { parseBusinessId, verifyBusinessRole } from '../../utils/validation/businessValidation';

async function deleteBusinessMember(req: Request, res: Response): Promise<void> {
	const businessId = parseBusinessId(req.params.businessId as string);
	const targetUserId = req.params.userId as string;
	const currentUserId = req.body.currentUserId;

	try {
		await verifyBusinessRole(businessId, currentUserId, ['owner']);

		// "Leaving a business" isn't a feature this pass builds — only an owner managing others.
		if (targetUserId === currentUserId) {
			throw new AppError(400, 'You cannot remove yourself from a business');
		}

		// The founding owner anchors the business: dresses are keyed under
		// business.owner_user_id_fk, so removing them would orphan the wardrobe.
		const business = await businessRepository.getBusinessById(businessId);

		if (!business) {
			throw new AppError(404, 'Business not found');
		}

		if (business.ownerUserIdFk === targetUserId) {
			logger.warn(
				`User '${currentUserId}' tried to remove founding owner '${targetUserId}' from business '${businessId}'`
			);
			throw new AppError(403, 'The founding owner cannot be removed from the business');
		}

		const result = await businessRepository.removeMember(businessId, targetUserId);

		if (result.rowCount === 0) {
			throw new AppError(404, 'Member not found');
		}

		logger.info(`Removed user '${targetUserId}' from business '${businessId}'`);

		res.status(200).send({ message: 'Member removed successfully' });
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error removing business member: ${error.message}`);
		throw new AppError(500, 'Unable to remove member. Please try again.');
	}
}

export default deleteBusinessMember;
