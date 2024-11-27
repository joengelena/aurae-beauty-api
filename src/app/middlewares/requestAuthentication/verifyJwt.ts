import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../../../config/logger';
import clearCookiesInResponse from './clearCookiesInResponse';

function verifyJwt(req: Request, res: Response) {
	try {
		logger.info('Verifying jwt token');
		const jwtCookie = req.cookies.jwt;

		if (!jwtCookie) {
			clearCookiesInResponse(res);
			res.statusMessage = 'Unauthorized: No jwt token provided';
			res.status(401).send();
		}

		const validJwt = jwt.verify(jwtCookie, process.env.JWT_SECRET);
		if (!validJwt) {
			clearCookiesInResponse(res);
			res.statusMessage = 'Unauthorized: Invalid jwt token';
			res.status(401).send();
		}

		logger.info('Verified jwt token');
	} catch (error) {
		logger.error(`Error verifying jwt token: ${error.message}`);
		clearCookiesInResponse(res);

		if (error.name === 'TokenExpiredError') {
			res.statusMessage =
				'Unauthorized: jwt token expired. User is signed out and needs to sign in again';
			res.status(401).send();
		} else {
			res.statusMessage = 'Unauthorized: Invalid jwt token';
			res.status(401).send();
		}
	}
}

export default verifyJwt;
