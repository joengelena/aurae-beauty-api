import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import {
	UserDBSchema,
	User,
	UserEmailValidationStatus,
} from '../../resources/types';

async function signUpUser(params: User): Promise<ResultSetHeader> {
	const {
		id,
		firstName,
		lastName,
		username,
		email,
		password,
		phoneNumber,
		isEmailVerified,
		isPhoneNumberVerified,
	} = params;

	logger.info(`Signing up new user with email '${email}' to the database`);

	const connection = await getPool().getConnection();
	const query = `INSERT into User
        (id, first_name, last_name, username, phone_number, email, password, is_email_verified, is_phone_number_verified) values
        (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
	const [result] = await connection.query<ResultSetHeader>(query, [
		id,
		firstName,
		lastName,
		username,
		phoneNumber,
		email,
		password,
		isEmailVerified,
		isPhoneNumberVerified,
	]);
	connection.release();

	return result;
}

async function registerAuthTokenWithEmail(
	token: string,
	email: string
): Promise<ResultSetHeader> {
	logger.info(`Registering a new token to ${email}`);

	const connection = await getPool().getConnection();
	const query = 'UPDATE user SET auth_token = ? WHERE email = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [
		token,
		email,
	]);
	connection.release();

	return result;
}

async function deleteAuthTokenForUserId(
	userId: string
): Promise<ResultSetHeader> {
	logger.info(`Deleting auth token for user with id '${userId}'`);

	const connection = await getPool().getConnection();
	const query = 'UPDATE user SET auth_token = NULL WHERE id = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [userId]);
	connection.release();

	return result;
}

async function getUserWithAuthToken(token: string): Promise<UserDBSchema[]> {
	logger.info(`Getting user with token '${token}' from the database`);

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM User WHERE auth_token = ?';
	const [result] = await connection.query<RowDataPacket[]>(query, [token]);
	connection.release();

	return mapUserDbToUserDTO(result as UserDBSchema[]);
}

async function checkIfEmailExists(email: string): Promise<UserDBSchema[]> {
	logger.info(`Checking if email '${email}' is already in the database`);

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM User WHERE email = ?';
	const [result] = await connection.query<RowDataPacket[]>(query, [email]);
	connection.release();

	return mapUserDbToUserDTO(result as UserDBSchema[]);
}

async function getUserByEmail(email: string): Promise<UserDBSchema[]> {
	logger.info(`Getting user with email '${email}' from the database`);

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM User WHERE email = ?';
	const [result] = await connection.query<RowDataPacket[]>(query, [email]);
	connection.release();

	return mapUserDbToUserDTO(result as UserDBSchema[]);
}

async function getUserById(id: string): Promise<UserDBSchema[]> {
	logger.info(`Getting user with id '${id}' from the database`);

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM User WHERE id = ?';
	const [result] = await connection.query<RowDataPacket[]>(query, [id]);
	connection.release();

	return mapUserDbToUserDTO(result as UserDBSchema[]);
}

async function updateUser(params: Partial<User>): Promise<ResultSetHeader> {
	logger.info(`Updating user with id '${params.id}' in the database`);

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
	connection.release();

	return result;
}

async function deleteUserWithId(id: string): Promise<ResultSetHeader> {
	logger.info(`Deleting user with id '${id}' from the database`);

	const connection = await getPool().getConnection();
	const query = 'DELETE FROM User WHERE id = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [id]);
	logger.info(`User with id '${id}' successfully deleted`);
	connection.release();

	return result;
}

async function getUserEmailValidationStatus(
	id: User['id']
): Promise<UserEmailValidationStatus[]> {
	logger.info(
		`Getting user with id '${id}' email validation status from the database`
	);

	const connection = await getPool().getConnection();
	const query = 'SELECT is_email_verified FROM User WHERE id = ?';
	const [result] = await connection.query<RowDataPacket[]>(query, [id]);
	logger.info(
		`Successfully got the email validation status for teh user with id: '${id}'`
	);
	connection.release();

	return result as UserEmailValidationStatus[];
}

async function updateUserEmailValidatedStatus(id: User['id'], status: 0 | 1) {
	logger.info(
		`Updating user with id '${id}' to have an email validated status of: ${status}`
	);

	const connection = await getPool().getConnection();
	const query = 'UPDATE User SET is_email_verified = ? WHERE id = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [
		status,
		id,
	]);
	connection.release();

	return result;
}

export {
	signUpUser,
	checkIfEmailExists,
	getUserByEmail,
	getUserById,
	updateUser,
	deleteUserWithId,
	registerAuthTokenWithEmail,
	deleteAuthTokenForUserId,
	getUserWithAuthToken,
	getUserEmailValidationStatus,
	updateUserEmailValidatedStatus,
};
function mapUserDbToUserDTO(
	arg0: UserDBSchema[]
): UserDBSchema[] | PromiseLike<UserDBSchema[]> {
	throw new Error('Function not implemented.');
}
