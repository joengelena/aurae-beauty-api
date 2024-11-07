import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { QueryResult } from 'mysql2';

async function signUpUser(
	id: string,
	firstName: string,
	lastName: string,
	userName: string,
	email: string,
	password: string,
	phoneNumber?: string
): Promise<QueryResult> {
	Logger.info(`Signing up new user with email '${email}' to the database`);

	const connection = await getPool().getConnection();
	const query = `INSERT into User 
        (Id, Firstname, Lastname, Username, PhoneNumber, Email, Password, EmailValidated) values
        (?, ?, ?, ?, ?, ?, ?, ?)`;
	const [result] = await connection.query(query, [
		id,
		firstName,
		lastName,
		userName,
		email,
		password,
		phoneNumber,
	]);

	connection.release();
	return result;
}

async function checkIfEmailExists(email: string): Promise<QueryResult> {
	Logger.info(`Checking if email '${email}' is already in the database`);
	const connection = await getPool().getConnection();
	const query = `SELECT * FROM User WHERE Email = ?`;
	const [result] = await connection.query(query, [email]);
	connection.release();
	return result;
}

async function getUserById(id: string): Promise<QueryResult> {
	Logger.info(`Getting user with id '${id}' from the database`);
	const connection = await getPool().getConnection();
	const query = `SELECT * FROM User WHERE Id = ?`;
	const [result] = await connection.query(query, [id]);
	connection.release();
	return result;
}

export { signUpUser, checkIfEmailExists, getUserById };
