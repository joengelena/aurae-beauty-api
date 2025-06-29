import { Request, Response, NextFunction } from 'express';
import logger from '../../../config/logger';
import verifyAuthToken from './verifyAuthToken';
import verifyJwtToken from './verifyJwtToken';
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
			res.statusMessage = csrfTokenVerified.statusMessage;
			res.status(csrfTokenVerified.status).send();
			return;
		}

		const jwtTokenVerified = verifyJwtToken(req);
		if (jwtTokenVerified !== VERIFIED) {
			res.statusMessage = jwtTokenVerified.statusMessage;
			res.status(jwtTokenVerified.status).send();
			return;
		}

		const authTokenVerified = await verifyAuthToken(req);
		if (authTokenVerified !== VERIFIED) {
			res.statusMessage = authTokenVerified.statusMessage;
			res.status(authTokenVerified.status).send();
			return;
		}

		next();
	} catch (error) {
		logger.error(`Error validating request: ${error.message}`);
		res.statusMessage = 'Unauthorized: Invalid request';
		res.status(401).send();
	}
}

export default validateRequest;
