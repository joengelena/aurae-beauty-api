import { Request, Response, NextFunction } from 'express';
import * as userModel from '../../models/user.model';
import logger from '../../../config/logger';
import verifyAuthToken from './verifyAuthToken';
import verifyJwt from './verifyJwt';
import clearCookiesInResponse from './clearCookiesInResponse';
async function validateRequest(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		verifyJwt(req, res);
		await verifyAuthToken(req, res);
		next();
	} catch (error) {
		clearCookiesInResponse(res);
		logger.error(`Error validating request: ${error.message}`);
		res.statusMessage = 'Unauthorized: Invalid request';
		res.status(401).send();
	}
}

export default validateRequest;
