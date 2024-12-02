import { Request, Response, NextFunction } from 'express';
import * as userModel from '../../models/user.model';
import logger from '../../../config/logger';
import verifyAuthToken from './verifyAuthToken';
import verifyJwtToken from './verifyJwtToken';
import clearCookiesInResponse from './clearCookiesInResponse';
import verifyCsrfToken from './verifyCsrfToken';
import { VERIFIED } from '../../resources/constants';

async function validateRequest(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const csrfTokenVerified = verifyCsrfToken(req);
		if (csrfTokenVerified !== VERIFIED) {
			clearCookiesInResponse(res);
			res.statusMessage = csrfTokenVerified.statusMessage;
			res.status(csrfTokenVerified.status).send();
			return;
		}

		const jwtTokenVerified = verifyJwtToken(req);
		if (jwtTokenVerified !== VERIFIED) {
			clearCookiesInResponse(res);
			res.statusMessage = jwtTokenVerified.statusMessage;
			res.status(jwtTokenVerified.status).send();
			return;
		}
		const authTokenVerified = await verifyAuthToken(req, res);
		if (authTokenVerified !== VERIFIED) {
			clearCookiesInResponse(res);
			res.statusMessage = authTokenVerified.statusMessage;
			res.status(authTokenVerified.status).send();
			return;
		}

		next();
	} catch (error) {
		clearCookiesInResponse(res);
		logger.error(`Error validating request: ${error.message}`);
		res.statusMessage = 'Unauthorized: Invalid request';
		res.status(401).send();
	}
}

export default validateRequest;
