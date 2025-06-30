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
			res.status(csrfTokenVerified.status).send({
				error: csrfTokenVerified.statusMessage,
			});
			return;
		}

		const jwtTokenVerified = verifyJwtToken(req);
		if (jwtTokenVerified !== VERIFIED) {
			res.status(jwtTokenVerified.status).send(
				jwtTokenVerified.statusMessage
			);
			return;
		}

		const authTokenVerified = await verifyAuthToken(req);
		if (authTokenVerified !== VERIFIED) {
			res.status(authTokenVerified.status).send(
				authTokenVerified.statusMessage
			);
			return;
		}

		next();
	} catch (error) {
		logger.error(`Error validating request: ${error.message}`);
		res.status(401).send('Unauthorized: Invalid request');
		return;
	}
}

export default validateRequest;
