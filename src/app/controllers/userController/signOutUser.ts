import ajvSchema from '../../resources/ajvSchema.json';
import * as userModel from '../../models/user.model';
import validateRequestBody from '../../middlewares/validator';
import { Request, Response } from 'express';

async function signOutUser(req: Request, res: Response): Promise<void> {
	validateRequestBody(ajvSchema.userSignOut, req.body, res);

	try {
		const authToken: string = req.cookies.authToken;
		const { email } = req.body;

		const userWithAuthToken = await userModel.getUserWithAuthToken(
			authToken
		);

		if (
			userWithAuthToken.length === 0 ||
			userWithAuthToken[0].email !== email
		) {
			res.statusMessage = 'Forbidden. Invalid credentials';
			res.status(403).send();
			return;
		}

		const authTokenDeleteResult = await userModel.deleteAuthTokenWithEmail(
			authToken,
			email
		);

		if (authTokenDeleteResult.affectedRows === 1) {
			res.clearCookie('authToken');
			res.clearCookie('jwt');
			res.statusMessage = 'User signed out successfully';
			res.status(200).send({
				message: 'User signed out successfully',
			});
			return;
		}
	} catch (error) {
		if (error.code === 'ER_DUP_ENTRY') {
			res.statusMessage = 'Forbidden. Email already in use';
			res.status(403).send();
		} else {
			res.statusMessage = 'Internal Server Error';
			res.status(500).send();
		}
	}
}

export default signOutUser;
