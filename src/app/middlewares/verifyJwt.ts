import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../../config/logger';

function verifyJwt(req: Request, res: Response, next: NextFunction) {
	try {
		logger.info('Verifying jwt token');
		const jwtCookie = req.cookies.jwt;

		if (!jwtCookie) {
			res.statusMessage = 'Unauthorized: No jwt token provided';
			res.status(401).send();
			return;
		}

		const validJwt = jwt.verify(jwtCookie, process.env.JWT_SECRET);
		if (!validJwt) {
			res.statusMessage = 'Unauthorized: Invalid jwt token';
			res.status(401).send();
			return;
		}

		logger.info('Verified jwt token');
		next();
	} catch (error) {
		if (error.name === 'TokenExpiredError') {
			res.statusMessage = 'Unauthorized: jwt token expired';
			res.status(401).send();
		}

		logger.error(`Error verifying jwt token: ${error.message}`);
		res.statusMessage = 'Unauthorized: Invalid jwt token';
		res.status(401).send();
		return;
	}
}

export default verifyJwt;
