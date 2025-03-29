import logger from '../../../config/logger';
import { Request, Response } from 'express';
import { comparePassword, hashPassword } from '../../utils/passwordHash';
import * as userRepository from '../../repositories/userRepository/userRepository';
import verifyJwt, { JwtStatus } from '../../utils/jwt/verifyJwt';
import jwt from 'jsonwebtoken';

async function resetPassword(req: Request, res: Response): Promise<void> {
	try {
		logger.info(
			`Resetting user password for user email '${req.body.email}'`
		);

		const jwtToken = req.params.token;
		const { email, newPassword } = req.body;

		const verifiedJwt = verifyJwt(jwtToken);

		if (verifiedJwt.status === JwtStatus.EXPIRED) {
			// Send another password reset link
		}

		if (verifiedJwt.status !== JwtStatus.VALID) {
			res.statusMessage = 'Forbidden. Invalid token';
			res.status(403).send();
			return;
		}

		const validJwt = verifiedJwt.data as jwt.JwtPayload;

		const user = await userRepository.getUserByEmail(email);

		if (user.length === 0 || user[0].id !== validJwt.userId) {
			res.statusMessage = 'Forbidden. Invalid token';
			res.status(403).send();
			return;
		}

		if (user[0].isEmailVerified === 0) {
			// Send the user an email verification link

			res.statusMessage = 'Forbidden. Email not verified';
			res.status(403).send();
			return;
		}

		const hashedNewPassword = await hashPassword(newPassword);

		await userRepository.updateUser({
			id: user[0].id,
			password: hashedNewPassword,
		});

		res.statusMessage = 'User password updated successfully';
		res.status(200).send({
			message: 'User password updated successfully',
		});
		return;
	} catch (error) {
		logger.error(`Error updating user password: ${error.message}`);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default resetPassword;
