import { Request, Response, NextFunction } from 'express';
import * as userModel from '../../models/user.model';
import logger from '../../../config/logger';
import verifyAuthToken from './verifyAuthToken';
import verifyJwt from './verifyJwt';

// function clearCookies(res: Response) {
// 	res.clearCookie('authToken');
// 	res.clearCookie('jwt');
// }

// function redirectUserToSignIn(res: Response) {
// 	res.redirect('/signin');
// }

async function validateRequest(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		if (!verifyJwt(req, res)) {
			return;
		}

		const verifyAuthTokenResult = await verifyAuthToken(req, res);
		if (!verifyAuthTokenResult) {
			return;
		}

		next();
	} catch (error) {
		logger.error(`Error validating request: ${error.message}`);
		res.statusMessage = 'Unauthorized: Invalid request';
		res.status(401).send();
		return;
	}
}

export default validateRequest;
