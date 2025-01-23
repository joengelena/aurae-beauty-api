import { Request, Response } from 'express';
import * as userRepository from '../../repositories/userRepository';
import logger from '../../../config/logger';

type updateDataType = {
	firstName: string;
	lastName: string;
	username: string;
	email: string;
	phoneNumber: string;
};

async function updateUser(req: Request, res: Response): Promise<void> {
	try {
		logger.info(
			`Updating user with id '${req.params.userId}' in the database`
		);
		const userId = req.params.id;
		const updateData: Partial<updateDataType> = {};

		if (req.body.firstName) {
			updateData.firstName = req.body.firstName;
		}

		if (req.body.lastName) {
			updateData.lastName = req.body.lastName;
		}

		if (req.body.username) {
			updateData.username = req.body.username;
		}

		if (req.body.email) {
			updateData.email = req.body.email;
		}

		await userRepository.updateUser({
			id: userId,
			...updateData,
		});

		res.statusMessage = 'User updated successfully';
		res.status(200).send({
			message: 'User updated successfully',
		});
		return;
	} catch (error) {
		logger.error('Error updating user: ', error);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default updateUser;
