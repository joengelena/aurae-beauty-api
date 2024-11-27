import ajvSchema from '../../resources/ajvSchema.json';
import * as userModel from '../../models/user.model';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../../middlewares/passwordHash';
import validateRequestBody from '../../middlewares/validator';
import { Request, Response } from 'express';

async function signUpUser(req: Request, res: Response): Promise<void> {
	validateRequestBody(ajvSchema.userSignUp, req.body, res);

	try {
		const { firstName, lastName, username, email, password, phoneNumber } =
			req.body;

		const id = uuidv4();

		const hashedPassword = await hashPassword(password);

		await userModel.signUpUser({
			id,
			firstName,
			lastName,
			username,
			email,
			password: hashedPassword,
			phoneNumber,
		});

		res.statusMessage = 'User created successfully';
		res.status(201).send({
			message: 'User created successfully',
			userId: id,
		});
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

export default signUpUser;
