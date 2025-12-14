import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { Pool, PoolClient, QueryResult } from 'pg';
import { User } from '../../resources/types';
import mapUserDbToObject from './mapUserDbToObject';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

async function signUpUser(
	params: User,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
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

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`INSERT into "user"
        (id, first_name, last_name, phone_number, email, is_email_verified, is_phone_number_verified) values
        (?, ?, ?, ?, ?, ?, ?)`);
	const result = await conn.query(query, [
		id,
		firstName,
		lastName,
		phoneNumber,
		email,
		isEmailVerified,
		isPhoneNumberVerified,
	]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function getUserById(
	id: string,
	connection?: Pool | PoolClient
): Promise<User[]> {
	logger.info(`Getting user with id '${id}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders('SELECT * FROM "user" WHERE id = ?');
	const result = await conn.query(query, [id]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return mapUserDbToObject(result.rows);
}

async function updateUser(
	params: Partial<User>,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(`Updating user with id '${params.id}' in the database`);

	const { id, ...updateFields } = params;
	const databaseFields: { [key: string]: string } = {
		firstName: 'first_name',
		lastName: 'last_name',
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

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`UPDATE "user" SET ${fields} WHERE id = ?`);
	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function deleteUserWithId(
	id: string,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(`Deleting user with id '${id}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders('DELETE FROM "user" WHERE id = ?');
	const result = await conn.query(query, [id]);
	logger.info(`User with id '${id}' successfully deleted`);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

export {
	signUpUser,
	getUserById,
	updateUser,
	deleteUserWithId,
};
