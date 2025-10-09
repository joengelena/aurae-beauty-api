import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { supabaseAdmin } from '../../../config/supabase';

async function changePasswordSupabase(req: Request, res: Response) {
	try {
		const { newPassword, currentUserId } = req.body;

		if (!newPassword) {
			res.status(400).send('New password is required');
			return;
		}

		// currentUserId is set by supabaseAuthenticateReq middleware
		if (!currentUserId) {
			res.status(401).send('Unauthorized');
			return;
		}

		logger.info(`Processing password change request for user: ${currentUserId}`);

		// Update the user's password using admin client
		const { error } = await supabaseAdmin.auth.admin.updateUserById(
			currentUserId,
			{ password: newPassword }
		);

		if (error) {
			logger.error(`Error changing password: ${error.message}`);
			res.status(500).send('Failed to change password');
			return;
		}

		logger.info(`Password changed successfully for user: ${currentUserId}`);
		res.status(200).send('Password changed successfully');
		return;
	} catch (error) {
		logger.error(`Error processing change password request: ${error}`);
		res.status(500).send('Internal server error');
		return;
	}
}

export default changePasswordSupabase;
