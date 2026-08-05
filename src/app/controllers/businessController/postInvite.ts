import { Request, Response } from 'express';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import { parseBusinessId, verifyBusinessRole } from '../../utils/validation/businessValidation';
import { generateInviteCode } from '../../utils/invite/generateInviteCode';

const INVITE_EXPIRY_DAYS = 7;

async function postInvite(req: Request, res: Response): Promise<void> {
	const businessId = parseBusinessId(req.params.businessId as string);
	const { currentUserId, role } = req.body;

	try {
		await verifyBusinessRole(businessId, currentUserId, ['owner']);

		const { code, codeHash } = generateInviteCode();
		const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

		const invite = await businessRepository.createInvite(
			businessId,
			role,
			currentUserId,
			codeHash,
			expiresAt
		);

		logger.info(`Created '${role}' invite for business '${businessId}'`);

		// code is returned exactly once — only codeHash is persisted
		res.status(201).send({
			message: 'Invite created successfully',
			invite,
			code,
		});
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error creating invite: ${error.message}`);
		throw new AppError(500, 'Unable to create invite. Please try again.');
	}
}

export default postInvite;
