import { Request, Response } from 'express';
import requestIsValid from '../middlewares/validator';
import ajvSchema from '../resources/ajvSchema.json';
import * as userModel from '../models/user.model';
import { v4 as uuidv4 } from 'uuid';
import { comparePassword, hashPassword } from '../middlewares/passwordHash';
import { generateJwtToken } from '../middlewares/jwtUtil';

async function signUpUser(req: Request, res: Response): Promise<void> {
	if (!requestIsValid(ajvSchema.userSignUp, req.body, res)) {
		return;
	}

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

async function signInUser(req: Request, res: Response): Promise<void> {
	if (!requestIsValid(ajvSchema.userSignIn, req.body, res)) {
		return;
	}

	try {
		const { email, password } = req.body;
		const user = await userModel.getUserByEmail(email);

		if (user.length === 0) {
			res.statusMessage = 'Forbidden. Email does not exist';
			res.status(403).send();
			return;
		}

		if (comparePassword(password, user[0].password)) {
			const jwtToken = generateJwtToken({
				email: user[0].email,
				username: user[0].username,
			});

			res.cookie('jwt', jwtToken, { httpOnly: true, secure: true });
			res.statusMessage = 'User logged in successfully';
			res.status(200).send({
				message: 'User logged in successfully',
				userId: user[0].Id,
			});
		} else {
			res.statusMessage = 'Forbidden. Invalid credentials';
			res.status(401).send();
		}
	} catch (error) {
		res.statusMessage = 'Internal Server Error';
		res.status(500).send();
	}
}

export { signUpUser, signInUser };
