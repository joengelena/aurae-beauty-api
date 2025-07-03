import * as userRepository from '../../repositories/userRepository/userRepository';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../../utils/passwordHash';
import { Request, Response } from 'express';
import { FALSE } from '../../resources/constants';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';

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
				throw new AppError(403, 'Forbidden. Email already in use');
			}

			if (lastWordInErrorMessage.includes('username')) {
				throw new AppError(403, 'Forbidden. Username already in use');
			}

			if (lastWordInErrorMessage.includes('phone_number')) {
				throw new AppError(
					403,
					'Forbidden. Phone number already in use'
				);
			}

			throw new AppError(403, lastWordInErrorMessage);
		}

		throw new AppError(500, 'Internal Server Error');
	}
}

export default signUpUser;
