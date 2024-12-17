import { Request, Response } from 'express';
import * as userModel from '../../models/user.model';
import { v4 as uuidv4 } from 'uuid';
import { comparePassword } from '../../util/passwordHash';
import { generateJwtToken } from '../../util/jwt/generateJwt';
import { CSRF_TOKEN, JWT_TOKEN } from '../../resources/constants';

async function signInUser(req: Request, res: Response): Promise<void> {
	try {
		const { email, password } = req.body;
		const user = await userModel.getUserByEmail(email);

		if (user.length === 0) {
			res.statusMessage = 'Forbidden. Email does not exist';
			res.status(403).send();
			return;
		}

		if (!comparePassword(password, user[0].password)) {
			res.statusMessage = 'Forbidden. Invalid credentials';
			res.status(403).send();
			return;
		}

		const authToken = uuidv4();
		const tokenSetResult = await userModel.registerAuthTokenWithEmail(
			authToken,
			email
		);

		if (tokenSetResult.affectedRows === 1) {
			const csrfToken = uuidv4();
			const jwtToken = generateJwtToken({
				userId: user[0].id,
			});

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

			res.statusMessage = 'User logged in successfully';
			res.status(200).send({
				message: 'User logged in successfully',
				userId: user[0].id,
				authToken,
				csrfToken,
			});
			return;
		}

		res.statusMessage = 'Forbidden. User does not exist';
		res.status(403).send();
		return;
	} catch (error) {
		res.statusMessage = 'Internal Server Error';
		res.status(500).send();
		return;
	}
}

export default signInUser;
