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
			res.status(403).send('Forbidden. Invalid token');
			return;
		}

		if (verifiedJwt.status === JwtStatus.EXPIRED) {
			await sendResetPasswordLink(user[0].id, email);
			// TODO: might have to change this to a different code because
			// technically it is not a successful request
			res.status(200).send('Email verification link sent successfully');
			return;
		}

		const hashedNewPassword = await hashPassword(newPassword);

		await userRepository.updateUser({
			id: user[0].id,
			password: hashedNewPassword,
		});

		res.status(200).send();
		return;
	} catch (error) {
		logger.error(`Error updating user password: ${error.message}`);
		res.status(500).send('Internal server error');
		return;
	}
}

export default resetPassword;
