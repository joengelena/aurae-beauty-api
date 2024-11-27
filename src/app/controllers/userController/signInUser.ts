import { Request, Response } from 'express';
import validateRequestBody from '../../middlewares/validator';
import ajvSchema from '../../resources/ajvSchema.json';
import * as userModel from '../../models/user.model';
import { v4 as uuidv4 } from 'uuid';
import { comparePassword } from '../../middlewares/passwordHash';
import { generateJwtToken } from '../../middlewares/generateJwt';

async function signInUser(req: Request, res: Response): Promise<void> {
	validateRequestBody(ajvSchema.userSignIn, req.body, res);

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
			const jwtToken = generateJwtToken({
				email: user[0].email,
				username: user[0].username,
			});

			res.cookie('authToken', authToken, {
				secure: true,
				sameSite: 'strict',
			});

			res.cookie('jwt', jwtToken, {
				httpOnly: true,
				secure: true,
				sameSite: 'strict',
			});

			res.statusMessage = 'User logged in successfully';
			res.status(200).send({
				message: 'User logged in successfully',
				userId: user[0].id,
			});
		}
	} catch (error) {
		res.statusMessage = 'Internal Server Error';
		res.status(500).send();
	}
}

export default signInUser;
