import { Request, Response } from 'express';
import logger from '../../../config/logger';
import jwt from 'jsonwebtoken';
import verifyJwt from '../../utils/jwt/verifyJwt';
import * as userRepository from '../../repositories/userRepository/userRepository';

async function validateEmailVerificationToken(req: Request, res: Response) {
	logger.info('Validating email verification token');

	try {
		const { token } = req.query;
		const validateJwt = verifyJwt(token as string);

		if (validateJwt.status === 'expired') {
			res.status(403).send(
				'Forbidden. Email verification link is expired'
			);
			return;
		}

		if (validateJwt.status === 'invalid') {
			res.status(403).send(
				'Forbidden. Invalid token, email verification link is invalid'
			);
			return;
		}

		const validJwt = validateJwt.data as jwt.JwtPayload;

		const updateEmailValidatedStatusResult =
			await userRepository.updateUserEmailValidatedStatus(
				validJwt.userId,
				1
			);

		if (updateEmailValidatedStatusResult.affectedRows === 1) {
			res.status(200).send();
			return;
		}

		logger.error(`Error validating email verification token`);
		res.status(500).send('Internal server error');
		return;
	} catch (error) {
		logger.error(`Error validating email verification token: ${error}`);
		res.status(500).send('Internal server error');
		return;
	}
}

export default validateEmailVerificationToken;
