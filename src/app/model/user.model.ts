import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { QueryResult } from 'mysql2';

type User = {
	id: string;
	firstName: string;
	lastName: string;
	userName: string;
	email: string;
	password: string;
	phoneNumber: string;
};

async function signUpUser(params: User): Promise<QueryResult> {
	const { id, firstName, lastName, userName, email, password, phoneNumber } =
		params;
	Logger.info(`Signing up new user with email '${email}' to the database`);
	const connection = await getPool().getConnection();

	try {
		const query = `INSERT into User 
        (Id, Firstname, Lastname, Username, PhoneNumber, Email, Password, EmailValidated, PhoneNumberValidated) values
        (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
		const [result] = await connection.query(query, [
			id,
			firstName,
			lastName,
			userName,
			email,
			password,
			phoneNumber,
		]);
		return result;
	} catch (error) {
		Logger.error(
			`Error signing up new user with email '${email}': ${error.message}`
		);
		throw error;
	} finally {
		connection.release();
	}
}

async function checkIfEmailExists(email: string): Promise<QueryResult> {
	Logger.info(`Checking if email '${email}' is already in the database`);
	const connection = await getPool().getConnection();

	try {
		const query = `SELECT * FROM User WHERE Email = ?`;
		const [result] = await connection.query(query, [email]);
		return result;
	} catch (error) {
		Logger.error(
			`Error checking to see if there exists a user with email '${email}': ${error.message}`
		);
		throw error;
	} finally {
		connection.release();
	}
}

async function getUserById(id: string): Promise<QueryResult> {
	Logger.info(`Getting user with id '${id}' from the database`);
	const connection = await getPool().getConnection();

	try {
		const query = `SELECT * FROM User WHERE Id = ?`;
		const [result] = await connection.query(query, [id]);
		return result;
	} catch (error) {
		Logger.error(`Error getting user with id '${id}': ${error.message}`);
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
	Logger.info(`Updating user with id: '${id}' in the database`);
	const connection = await getPool().getConnection();

	try {
		const fields = Object.keys(updateFields)
			.map((key) => `${key} = ?`)
			.join(', ');
		const values = Object.values(updateFields);
		values.push(id);

		const query = `UPDATE User SET ${fields} WHERE Id = ?`;
		const [result] = await connection.query(query, values);

		Logger.info(`User with id '${id}' successfully updated`);
		return result;
	} catch (error) {
		Logger.error(`Error updating user with id '${id}': ${error.message}`);
		throw error;
	} finally {
		connection.release();
	}
}

async function deleteUserWithId(id: string): Promise<QueryResult> {
	Logger.info(`Deleting user with id '${id}' from the database`);
	const connection = await getPool().getConnection();

	try {
		const query = `DELETE FROM User WHERE Id = ?`;
		const [result] = await connection.query(query, [id]);
		Logger.info(`User with id '${id}' successfully deleted`);
		return result;
	} catch (error) {
		Logger.error(`Error deleting user with id '${id}': ${error.message}`);
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
