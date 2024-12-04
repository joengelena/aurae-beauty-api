import { Request, Response } from 'express';
import * as userModel from '../../models/user.model';

async function viewUser(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.body.userId;
		const users = await userModel.getUserById(userId);

		if (users.length === 0) {
			res.statusMessage = 'Not found. No user with specified id';
			res.status(404).send();
			return;
		}

		const user = {
			firstName: users[0].first_name,
			lastName: users[0].last_name,
			username: users[0].username,
			phoneNumber: users[0].phone_number,
			email: users[0].email,
		};

		res.statusMessage = 'User found';
		res.status(200).send(user);
		return;
	} catch (error) {
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default viewUser;
