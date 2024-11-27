import { Request, Response, NextFunction } from 'express';
import * as userModel from '../../models/user.model';
import logger from '../../../config/logger';
import clearCookiesInResponse from './clearCookiesInResponse';

async function verifyAuthToken(req: Request, res: Response) {
	try {
		logger.info('Verifying auth token');
		const authToken = req.cookies.authToken;
		const email = req.body.email;

		if (!authToken) {
			clearCookiesInResponse(res);
			res.statusMessage = 'Unauthorized: No auth token provided';
			res.status(401).send();
		}

		const userWithAuthToken = await userModel.getUserWithAuthToken(
			authToken
		);

		if (
			userWithAuthToken.length === 0 ||
			userWithAuthToken[0].email !== email
		) {
			clearCookiesInResponse(res);
			res.statusMessage = 'Unauthorized: Invalid auth token';
			res.status(401).send();
		}

		logger.info('Verified auth token');
	} catch (error) {
		clearCookiesInResponse(res);
		logger.error(`Error verifying auth token: ${error.message}`);
		res.statusMessage = 'Unauthorized: Invalid auth token';
		res.status(401).send();
	}
}

export default verifyAuthToken;
