import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { User } from '../../resources/types';
import mapUserDbToObject from './mapUserDbToObject';

async function signUpUser(params: User): Promise<ResultSetHeader> {
	const {
		id,
		firstName,
		lastName,
		email,
		phoneNumber,
		isEmailVerified,
		isPhoneNumberVerified,
	} = params;

	logger.info(`Signing up new user with email '${email}' to the database`);

	const connection = await getPool().getConnection();
	const query = `INSERT into User
        (id, first_name, last_name, phone_number, email, is_email_verified, is_phone_number_verified) values
        (?, ?, ?, ?, ?, ?, ?)`;
	const [result] = await connection.query<ResultSetHeader>(query, [
		id,
		firstName,
		lastName,
		phoneNumber,
		email,
		isEmailVerified,
		isPhoneNumberVerified,
	]);
	connection.release();

	return result;
}

async function getUserById(id: string): Promise<User[]> {
	logger.info(`Getting user with id '${id}' from the database`);

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM User WHERE id = ?';
	const [result] = await connection.query<RowDataPacket[]>(query, [id]);
	connection.release();

	return mapUserDbToObject(result);
}

async function updateUser(params: Partial<User>): Promise<ResultSetHeader> {
	logger.info(`Updating user with id '${params.id}' in the database`);

	const { id, ...updateFields } = params;
	const connection = await getPool().getConnection();
	const databaseFields: { [key: string]: string } = {
		firstName: 'first_name',
		lastName: 'last_name',
		email: 'email',
		phoneNumber: 'phone_number',
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

export {
	signUpUser,
	getUserById,
	updateUser,
	deleteUserWithId,
};
