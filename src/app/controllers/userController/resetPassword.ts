import logger from '../../../config/logger';
import { Request, Response } from 'express';
import { hashPassword } from '../../utils/passwordHash';
import * as userRepository from '../../repositories/userRepository/userRepository';
import verifyJwt, { JwtStatus } from '../../utils/jwt/verifyJwt';
import jwt from 'jsonwebtoken';
import { sendResetPasswordLink } from '../../utils/email/emailService';

async function resetPassword(req: Request, res: Response): Promise<void> {
	try {
		logger.info(
			`Resetting user password for user email '${req.body.email}'`
		);

		const jwtToken = req.params.token;
		const { email, newPassword } = req.body;
		const user = await userRepository.getUserByEmail(email);
		const verifiedJwt = verifyJwt(jwtToken);
		const jwtPayload = verifiedJwt.data as jwt.JwtPayload;

		if (
			verifiedJwt.status === JwtStatus.INVALID ||
			user.length === 0 ||
			user[0].id !== jwtPayload.userId
		) {
			res.statusMessage = 'Forbidden. Invalid token';
			res.status(403).send();
			return;
		}

		if (verifiedJwt.status === JwtStatus.EXPIRED) {
			await sendResetPasswordLink(user[0].id, email);
			res.statusMessage = 'Email verification link sent successfully';
			res.status(200).send();
			return;
		}

		const hashedNewPassword = await hashPassword(newPassword);

		await userRepository.updateUser({
			id: user[0].id,
			password: hashedNewPassword,
		});

		res.statusMessage = 'Successfully reset password';
		res.status(200).send();
		return;
	} catch (error) {
		logger.error(`Error updating user password: ${error.message}`);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default resetPassword;
