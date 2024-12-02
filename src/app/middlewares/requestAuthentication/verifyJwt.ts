import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../../../config/logger';
import { VERIFIED } from '../../resources/constants';

function verifyJwt(req: Request) {
	try {
		logger.info('Verifying jwt token');
		const jwtCookie = req.cookies.jwt;

		if (!jwtCookie) {
			return {
				status: 401,
				statusMessage: 'Unauthorized: No jwt token provided',
			};
		}

		const validJwt = jwt.verify(jwtCookie, process.env.JWT_SECRET);
		if (!validJwt) {
			return {
				status: 401,
				statusMessage: 'Unauthorized: Invalid jwt token',
			};
		}

		logger.info('Verified jwt token');
		return VERIFIED;
	} catch (error) {
		logger.error(`Error verifying jwt token: ${error.message}`);

		if (error.name === 'TokenExpiredError') {
			return {
				status: 401,
				statusMessage:
					'Unauthorized: jwt token expired. User is signed out and needs to sign in again',
			};
		}

		return {
			status: 401,
			statusMessage: 'Unauthorized: Invalid jwt token',
		};
	}
}

export default verifyJwt;
