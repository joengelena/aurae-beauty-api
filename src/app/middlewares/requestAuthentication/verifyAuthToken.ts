import { Request, Response, NextFunction } from 'express';
import * as userModel from '../../models/user.model';
import logger from '../../../config/logger';
import { VERIFIED } from '../../resources/constants';

async function verifyAuthToken(req: Request, res: Response) {
	try {
		logger.info('Verifying auth token');
		const authToken = req.headers['x-auth-token'];
		const userId = req.body.userId;

		if (!authToken) {
			return {
				status: 401,
				statusMessage: 'Unauthorized: No auth token provided',
			};
		}

		const userWithAuthToken = await userModel.getUserWithAuthToken(
			authToken[0]
		);

		if (
			userWithAuthToken.length === 0 ||
			userWithAuthToken[0].id !== userId
		) {
			return {
				status: 401,
				statusMessage: 'Unauthorized: Invalid auth token',
			};
		}

		logger.info('Verified auth token');
		return VERIFIED;
	} catch (error) {
		logger.error(`Error verifying auth token: ${error.message}`);

		return {
			status: 401,
			statusMessage: 'Unauthorized: Invalid auth token',
		};
	}
}

export default verifyAuthToken;
