import { Request, Response } from 'express';
import * as userRepository from '../../repositories/userRepository/userRepository';
import { v4 as uuidv4 } from 'uuid';
import { comparePassword } from '../../utils/passwordHash';
import { generateJwtToken } from '../../utils/jwt/generateJwt';
import { CSRF_TOKEN, JWT_TOKEN } from '../../resources/constants';
import logger from '../../../config/logger';

async function signInUser(req: Request, res: Response): Promise<void> {
	logger.info(`Signing in user with email: '${req.body.email}'`);

	try {
		const { email, password } = req.body;
		const user = await userRepository.getUserByEmail(email);

		if (user.length === 0) {
			res.status(403).send('Email not found, please sign up');
			return;
		}

		if (!comparePassword(password, user[0].password)) {
			res.status(403).send('Invalid credentials, please try again');
			return;
		}

		const authToken = uuidv4();
		const tokenSetResult = await userRepository.registerAuthTokenWithEmail(
			authToken,
			email
		);

		if (tokenSetResult.affectedRows === 1) {
			const csrfToken = uuidv4();
			const jwtToken = generateJwtToken({ userId: user[0].id }, '1h');

			res.cookie(CSRF_TOKEN, csrfToken, {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
			});

			res.cookie(JWT_TOKEN, jwtToken, {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
			});

			res.status(200).send({
				userId: user[0].id,
				authToken,
				csrfToken,
			});
			return;
		}

		res.status(403).send('Email not found, please sign up');
		return;
	} catch (error) {
		logger.error(`Error signing in user with email: ${error}`);
		res.status(500).send(
			'Something went wrong on our end. Please try again in a moment'
		);
		return;
	}
}

export default signInUser;
