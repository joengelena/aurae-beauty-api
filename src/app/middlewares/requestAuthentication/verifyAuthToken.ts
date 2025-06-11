import { Request, Response, NextFunction } from 'express';
import * as userModel from '../../repositories/userRepository/userRepository';
import logger from '../../../config/logger';
import { VERIFIED } from '../../resources/constants';

async function verifyAuthToken(req: Request) {
	try {
		logger.info('Verifying auth token');
		const authToken = req.headers['mtx-auth-token'] as string;
		const userId = req.body.currentUserId;

		if (!authToken) {
			return {
				status: 401,
				statusMessage: 'Unauthorized: No auth token provided',
			};
		}

		const userWithAuthToken = await userModel.getUserWithAuthToken(
			authToken
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
