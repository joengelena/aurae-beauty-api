import { Request, Response } from 'express';
import logger from '../../../config/logger';
import jwt from 'jsonwebtoken';
import verifyJwt from '../../utils/jwt/verifyJwt';
import * as userRepository from '../../repositories/userRepository';

async function validateEmailVerificationToken(req: Request, res: Response) {
	logger.info('Validating email verification token');

	try {
		const jwtToken = req.params.token;

		const validateJwt = verifyJwt(jwtToken);

		if (validateJwt.status === 'expired') {
			res.statusMessage = 'Forbidden. Email verification link is expired';
			res.status(403).send();
			return;
		}

		if (validateJwt.status === 'invalid') {
			res.statusMessage =
				'Forbidden. Invalid token, email verification link is invalid';
			res.status(403).send();
			return;
		}

		const validJwt = validateJwt.data as jwt.JwtPayload;

		const updateEmailValidatedStatusResult =
			await userRepository.updateUserEmailValidatedStatus(
				validJwt.userId,
				1
			);

		if (updateEmailValidatedStatusResult.affectedRows === 1) {
			res.statusMessage = 'Email validated successfully';
			res.status(200).send({
				message: 'Email validated successfully',
			});
			return;
		}

		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	} catch (error) {
		if (error.code === 'TokenExpiredError') {
		}
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default validateEmailVerificationToken;
