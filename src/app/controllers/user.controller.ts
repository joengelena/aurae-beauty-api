import { Request, Response } from 'express';
import { validate } from '../middlewares/validator';
import ajvSchema from '../resources/ajvSchema.json';
import * as userModel from '../models/user.model';
import { v4 as uuidv4 } from 'uuid';

async function signUpUser(req: Request, res: Response): Promise<void> {
	const validation = validate(ajvSchema.userSignUp, req.body);

	if (!validation) {
		res.status(400).send({
			message: `Invalid request: ${validation.toString()}`,
		});
		return;
	}

	try {
		const { firstName, lastName, username, email, password, phoneNumber } =
			req.body;
		const id = uuidv4();
		await userModel.signUpUser({
			id,
			firstName,
			lastName,
			username,
			email,
			password,
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

export { signUpUser };
