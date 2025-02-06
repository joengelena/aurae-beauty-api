import * as userRepository from '../../repositories/userRepository';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../../utils/passwordHash';
import { Request, Response } from 'express';
import { FALSE } from '../../resources/constants';
import logger from '../../../config/logger';

async function signUpUser(req: Request, res: Response): Promise<void> {
	logger.info('Signing up new user with username: ' + req.body.username);

	try {
		const { firstName, lastName, username, email, password, phoneNumber } =
			req.body;

		const id = uuidv4();

		const hashedPassword = await hashPassword(password);

		await userRepository.signUpUser({
			id,
			firstName,
			lastName,
			username,
			email,
			password: hashedPassword,
			phoneNumber,
			isEmailVerified: FALSE,
			isPhoneNumberVerified: FALSE,
		});

		res.statusMessage = 'User created successfully';
		res.status(201).send({
			message: 'User created successfully',
			userId: id,
		});
		return;
	} catch (error) {
		if (error.code === 'ER_DUP_ENTRY') {
			const splitErrorMessage = error.sqlMessage.split(' ');
			const lastWordInErrorMessage =
				splitErrorMessage[splitErrorMessage.length - 1];

			if (lastWordInErrorMessage.includes('email')) {
				res.statusMessage = 'Forbidden. Email already in use';
				res.status(403).send();
				return;
			}

			if (lastWordInErrorMessage.includes('username')) {
				res.statusMessage = 'Forbidden. Username already in use';
				res.status(403).send();
				return;
			}

			if (lastWordInErrorMessage.includes('phone_number')) {
				res.statusMessage = 'Forbidden. Phone number already in use';
				res.status(403).send();
				return;
			}

			req.statusMessage = lastWordInErrorMessage;
			res.status(403).send();
			return;
		}

		res.statusMessage = 'Internal Server Error';
		res.status(500).send();
		return;
	}
}

export default signUpUser;
