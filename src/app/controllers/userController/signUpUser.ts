import * as userRepository from '../../repositories/userRepository/userRepository';
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
				res.status(403).send('Forbidden. Email already in use');
				return;
			}

			if (lastWordInErrorMessage.includes('username')) {
				res.status(403).send('Forbidden. Username already in use');
				return;
			}

			if (lastWordInErrorMessage.includes('phone_number')) {
				res.status(403).send('Forbidden. Phone number already in use');
				return;
			}

			res.status(403).send(lastWordInErrorMessage);
			return;
		}

		logger.error(`Error signing up user: ${error}`);
		res.status(500).send('Internal Server Error');
		return;
	}
}

export default signUpUser;
