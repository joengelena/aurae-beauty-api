import { Request, Response } from 'express';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import { parseBusinessId, verifyBusinessRole } from '../../utils/validation/businessValidation';
import { parsePositiveIntId } from '../../utils/validation/idValidation';

async function deleteInvite(req: Request, res: Response): Promise<void> {
	const businessId = parseBusinessId(req.params.businessId as string);
	const inviteId = parsePositiveIntId(req.params.id as string, 'invite ID');
	const currentUserId = req.body.currentUserId;

	try {
		await verifyBusinessRole(businessId, currentUserId, ['owner']);

		const result = await businessRepository.revokeInvite(inviteId, businessId);

		if (result.rowCount === 0) {
			throw new AppError(404, 'Invite not found or already used');
		}

		res.status(200).send({ message: 'Invite revoked successfully' });
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error revoking invite: ${error.message}`);
		throw new AppError(500, 'Unable to revoke invite. Please try again.');
	}
}

export default deleteInvite;
