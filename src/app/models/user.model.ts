import { getPool } from '../../config/db';
import logger from '../../config/logger';
import { QueryResult } from 'mysql2';

type User = {
	id: string;
	firstName: string;
	lastName: string;
	username: string;
	email: string;
	password: string;
	phoneNumber: string;
};

async function signUpUser(params: User): Promise<QueryResult> {
	const { id, firstName, lastName, username, email, password, phoneNumber } =
		params;
	logger.info(`Signing up new user with email '${email}' to the database`);
	const connection = await getPool().getConnection();

	try {
		const query = `INSERT into User
        (Id, Firstname, Lastname, Username, PhoneNumber, Email, Password, EmailValidated, PhoneNumberValidated) values
        (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
		const [result] = await connection.query(query, [
			id,
			firstName,
			lastName,
			username,
			email,
			password,
			phoneNumber,
		]);
		return result;
	} catch (error) {
		logger.error(
			`Error signing up new user with email '${email}': ${error.message}`
		);
		throw error;
	} finally {
		connection.release();
	}
}

async function checkIfEmailExists(email: string): Promise<QueryResult> {
	logger.info(`Checking if email '${email}' is already in the database`);
	const connection = await getPool().getConnection();

	try {
		const query = `SELECT * FROM User WHERE Email = ?`;
		const [result] = await connection.query(query, [email]);
		return result;
	} catch (error) {
		logger.error(
			`Error checking to see if there exists a user with email '${email}': ${error.message}`
		);
		throw error;
	} finally {
		connection.release();
	}
}

async function getUserById(id: string): Promise<QueryResult> {
	logger.info(`Getting user with id '${id}' from the database`);
	const connection = await getPool().getConnection();

	try {
		const query = `SELECT * FROM User WHERE Id = ?`;
		const [result] = await connection.query(query, [id]);
		return result;
	} catch (error) {
		logger.error(`Error getting user with id '${id}': ${error.message}`);
		throw error;
	} finally {
		connection.release();
	}
}

async function updateUser(params: Partial<User>): Promise<QueryResult> {
	const { id, ...updateFields } = params;
	if (!id) {
		throw new Error('User ID is required to update user');
	}
	if (Object.keys(updateFields).length === 0) {
		throw new Error('No fields provided to update');
	}
	logger.info(`Updating user with id: '${id}' in the database`);
	const connection = await getPool().getConnection();

	try {
		const fields = Object.keys(updateFields)
			.map((key) => `${key} = ?`)
			.join(', ');
		const values = Object.values(updateFields);
		values.push(id);

		const query = `UPDATE User SET ${fields} WHERE Id = ?`;
		const [result] = await connection.query(query, values);

		logger.info(`User with id '${id}' successfully updated`);
		return result;
	} catch (error) {
		logger.error(`Error updating user with id '${id}': ${error.message}`);
		throw error;
	} finally {
		connection.release();
	}
}

async function deleteUserWithId(id: string): Promise<QueryResult> {
	logger.info(`Deleting user with id '${id}' from the database`);
	const connection = await getPool().getConnection();

	try {
		const query = `DELETE FROM User WHERE Id = ?`;
		const [result] = await connection.query(query, [id]);
		logger.info(`User with id '${id}' successfully deleted`);
		return result;
	} catch (error) {
		logger.error(`Error deleting user with id '${id}': ${error.message}`);
		throw error;
	} finally {
		connection.release();
	}
}

export {
	signUpUser,
	checkIfEmailExists,
	getUserById,
	updateUser,
	deleteUserWithId,
};
