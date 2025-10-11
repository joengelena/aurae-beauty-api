import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { supabaseAdmin } from '../../../config/supabase';
import AppError from '../../utils/errors/appError';

async function changePasswordSupabase(req: Request, res: Response): Promise<void> {
	const { newPassword, currentUserId } = req.body;

	logger.info(`Processing password change request for user: ${currentUserId}`);

	try {
		if (!newPassword) {
			throw new AppError(400, 'New password is required');
		}

		// currentUserId is set by supabaseAuthenticateReq middleware
		if (!currentUserId) {
			throw new AppError(401, 'Unauthorized');
		}

		// Update the user's password using admin client
		const { error } = await supabaseAdmin.auth.admin.updateUserById(
			currentUserId,
			{ password: newPassword }
		);

		if (error) {
			logger.error(`Error changing password: ${error.message}`);
			throw new AppError(500, `Failed to change password: ${error.message}`);
		}

		logger.info(`Password changed successfully for user: ${currentUserId}`);
		res.status(200).send({
			message: 'Password changed successfully',
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during password change: ${error.message}`);
		throw new AppError(500, 'Internal Server Error');
	}
}

export default changePasswordSupabase;
