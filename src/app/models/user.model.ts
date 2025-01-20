import { getPool } from '../../config/db';
import logger from '../../config/logger';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { userDBSchema } from '../resources/databaseTypes';

type User = {
	id: string;
	firstName: string;
	lastName: string;
	username: string;
	email: string;
	password: string;
	phoneNumber: string;
};

async function signUpUser(params: User): Promise<ResultSetHeader> {
	const { id, firstName, lastName, username, email, password, phoneNumber } =
		params;
	logger.info(`Signing up new user with email '${email}' to the database`);
	const connection = await getPool().getConnection();
	const emailNotValidated = 0;
	const phoneNumberNotValidated = 0;

	try {
		const query = `INSERT into User
        (id, first_name, last_name, username, phone_number, email, password, email_validated, phone_number_validated) values
        (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
		const [result] = await connection.query<ResultSetHeader>(query, [
			id,
			firstName,
			lastName,
			username,
			phoneNumber,
			email,
			password,
			emailNotValidated,
			phoneNumberNotValidated,
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

async function registerAuthTokenWithEmail(
	token: string,
	email: string
): Promise<ResultSetHeader> {
	logger.info(`Registering a new token to ${email}`);
	const connection = await getPool().getConnection();

	try {
		const query = 'UPDATE user SET auth_token = ? WHERE email = ?';
		const [result] = await connection.query<ResultSetHeader>(query, [
			token,
			email,
		]);
		return result;
	} catch (error) {
		logger.error(
			`Error registering a new token to ${email}: ${error.message}`
		);
		throw error;
	} finally {
		connection.release();
	}
}

async function deleteAuthTokenWithEmail(
	token: string,
	email: string
): Promise<ResultSetHeader> {
	logger.info(`Checking if the token ${token} is in the database`);
	const connection = await getPool().getConnection();

	try {
		const query =
			'UPDATE user SET auth_token = NULL WHERE auth_token = ? AND email = ?';
		const [result] = await connection.query<ResultSetHeader>(query, [
			token,
			email,
		]);
		return result;
	} catch (error) {
		logger.error(
			`Error checking if the token ${token} is in the database: ${error.message}`
		);
		throw error;
	} finally {
		connection.release();
	}
}

async function getUserWithAuthToken(token: string): Promise<userDBSchema[]> {
	logger.info(`Getting user with token '${token}' from the database`);
	const connection = await getPool().getConnection();

	try {
		const query = 'SELECT * FROM User WHERE auth_token = ?';
		const [result] = await connection.query<RowDataPacket[]>(query, [
			token,
		]);
		return result as userDBSchema[];
	} catch (error) {
		logger.error(
			`Error getting user with token '${token}': ${error.message}`
		);
		throw error;
	} finally {
		connection.release();
	}
}

async function checkIfEmailExists(email: string): Promise<userDBSchema[]> {
	logger.info(`Checking if email '${email}' is already in the database`);
	const connection = await getPool().getConnection();

	try {
		const query = 'SELECT * FROM User WHERE email = ?';
		const [result] = await connection.query<RowDataPacket[]>(query, [
			email,
		]);
		return result as userDBSchema[];
	} catch (error) {
		logger.error(
			`Error checking to see if there exists a user with email '${email}': ${error.message}`
		);
		throw error;
	} finally {
		connection.release();
	}
}

async function getUserByEmail(email: string): Promise<userDBSchema[]> {
	logger.info(`Getting user with email '${email}' from the database`);
	const connection = await getPool().getConnection();

	try {
		const query = 'SELECT * FROM User WHERE email = ?';
		const [result] = await connection.query<RowDataPacket[]>(query, [
			email,
		]);
		return result as userDBSchema[];
	} catch (error) {
		logger.error(
			`Error getting user with email '${email}': ${error.message}`
		);
		throw error;
	} finally {
		connection.release();
	}
}

async function getUserById(id: string): Promise<userDBSchema[]> {
	logger.info(`Getting user with id '${id}' from the database`);
	const connection = await getPool().getConnection();

	try {
		const query = 'SELECT * FROM User WHERE id = ?';
		const [result] = await connection.query<RowDataPacket[]>(query, [id]);
		return result as userDBSchema[];
	} catch (error) {
		logger.error(`Error getting user with id '${id}': ${error.message}`);
		throw error;
	} finally {
		connection.release();
	}
}

async function updateUser(params: Partial<User>): Promise<ResultSetHeader> {
	const { id, ...updateFields } = params;
	const connection = await getPool().getConnection();
	const databaseFields: { [key: string]: string } = {
		firstName: 'first_name',
		lastName: 'last_name',
		username: 'username',
		email: 'email',
		phoneNumber: 'phone_number',
		password: 'password',
	};

	try {
		logger.info(`Updating user with id: '${id}' in the database`);

		if (!id) {
			throw new Error('User ID is required to update user');
		}

		if (Object.keys(updateFields).length === 0) {
			throw new Error('No fields provided to update');
		}

		const fields = Object.keys(updateFields)
			.map((key) => `${databaseFields[key]} = ?`)
			.join(', ');
		const values = Object.values(updateFields);

		values.push(id);

		const query = `UPDATE User SET ${fields} WHERE id = ?`;
		const [result] = await connection.query<ResultSetHeader>(query, values);

		logger.info(`User with id '${id}' successfully updated`);
		return result;
	} catch (error) {
		logger.error(`Error updating user with id '${id}': ${error.message}`);
		throw error;
	} finally {
		connection.release();
	}
}

async function deleteUserWithId(id: string): Promise<ResultSetHeader> {
	logger.info(`Deleting user with id '${id}' from the database`);
	const connection = await getPool().getConnection();

	try {
		const query = 'DELETE FROM User WHERE id = ?';
		const [result] = await connection.query<ResultSetHeader>(query, [id]);
		logger.info(`User with id '${id}' successfully deleted`);
		return result;
	} catch (error) {
		logger.error(`Error deleting user with id '${id}': ${error.message}`);
		throw error;
	} finally {
		connection.release();
	}
}

async function updateUserEmailValidatedStatus(
	email: User['email'],
	id: User['id'],
	status: number
) {
	logger.info(
		`Updating user with id '${id}' to have an email validated status of: ${status}`
	);
	const connection = await getPool().getConnection();

	try {
		const query =
			'UPDATE User SET email_validated = ? WHERE email = ? AND id = ?';
		const [result] = await connection.query<ResultSetHeader>(query, [
			status,
			email,
			id,
		]);
		logger.info(
			`User with id '${id}' successfully updated email validation status`
		);
		return result;
	} catch (error) {
		logger.error(
			`Error updating user with id '${id}' email validation status: ${error.message}`
		);
		throw error;
	} finally {
		connection.release();
	}
}

export {
	signUpUser,
	checkIfEmailExists,
	getUserByEmail,
	getUserById,
	updateUser,
	deleteUserWithId,
	registerAuthTokenWithEmail,
	deleteAuthTokenWithEmail,
	getUserWithAuthToken,
	updateUserEmailValidatedStatus,
};
