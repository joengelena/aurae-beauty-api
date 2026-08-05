import { Request, Response } from 'express';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import { hashInviteCode } from '../../utils/invite/generateInviteCode';
import { withTransaction } from '../../utils/database/transactionHandler';

async function postRedeemInvite(req: Request, res: Response): Promise<void> {
	const { currentUserId, code } = req.body;

	await withTransaction(
		async (connection) => {
			const existingMembership = await businessRepository.getMembershipForUser(
				currentUserId,
				connection
			);

			if (existingMembership) {
				throw new AppError(409, 'You already belong to a business');
			}

			const invite = await businessRepository.getInviteByCodeHash(
				hashInviteCode(code),
				connection
			);

			if (!invite || invite.status !== 'pending') {
				throw new AppError(404, 'Invite code is invalid or has already been used');
			}

			if (invite.expiresAt.getTime() < Date.now()) {
				throw new AppError(410, 'Invite code has expired');
			}

			await businessRepository.addMember(
				invite.businessIdFk,
				currentUserId,
				invite.role,
				connection
			);
			await businessRepository.markInviteRedeemed(invite.id, currentUserId, connection);

			logger.info(
				`User '${currentUserId}' redeemed invite for business '${invite.businessIdFk}' as '${invite.role}'`
			);

			const business = await businessRepository.getBusinessById(
				invite.businessIdFk,
				connection
			);

			res.status(200).send({
				message: 'Invite redeemed successfully',
				business,
				role: invite.role,
			});
		},
		res,
		'redeem invite'
	);
}

export default postRedeemInvite;
