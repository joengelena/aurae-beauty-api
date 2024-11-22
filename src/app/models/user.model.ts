import { getPool } from '../../config/db';
import logger from '../../config/logger';
import {
	FieldPacket,
	ProcedureCallPacket,
	QueryResult,
	ResultSetHeader,
	RowDataPacket,
} from 'mysql2';
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

async function checkIfEmailExists(email: string): Promise<userDBSchema[]> {
	logger.info(`Checking if email '${email}' is already in the database`);
	const connection = await getPool().getConnection();

	try {
		const query = `SELECT * FROM User WHERE email = ?`;
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
		const query = `SELECT * FROM User WHERE email = ?`;
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
		const query = `SELECT * FROM User WHERE id = ?`;
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
	// This wont work because the schema has different column names
	// the const fields uses example "firstName" but the schema uses "first_name"
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
		const query = `DELETE FROM User WHERE id = ?`;
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

export {
	signUpUser,
	checkIfEmailExists,
	getUserByEmail,
	getUserById,
	updateUser,
	deleteUserWithId,
};
