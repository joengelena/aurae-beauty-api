import { Request, Response, NextFunction } from 'express';
import * as userModel from '../../models/user.model';
import logger from '../../../config/logger';

async function verifyAuthToken(req: Request, res: Response) {
	try {
		logger.info('Verifying auth token');
		const authToken = req.cookies.authToken;
		const email = req.body.email;

		if (!authToken) {
			res.statusMessage = 'Unauthorized: No auth token provided';
			res.status(401).send();
			return false;
		}

		const userWithAuthToken = await userModel.getUserWithAuthToken(
			authToken
		);

		if (
			userWithAuthToken.length === 0 ||
			userWithAuthToken[0].email !== email
		) {
			res.statusMessage = 'Unauthorized: Invalid auth token';
			res.status(401).send();
			return false;
		}

		logger.info('Verified auth token');
		return true;
	} catch (error) {
		logger.error(`Error verifying auth token: ${error.message}`);
		res.statusMessage = 'Unauthorized: Invalid auth token';
		res.status(401).send();
		return false;
	}
}

export default verifyAuthToken;
