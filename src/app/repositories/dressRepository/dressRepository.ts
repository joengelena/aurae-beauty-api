import { Pool, PoolClient, QueryResult } from 'pg';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { UserDress } from '../../resources/types';
import mapDressDbToObject from './mapDressDbToObject';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

const dressDbFields: Record<keyof UserDress, string> = {
	id: 'id',
	userIdFk: 'user_id_fk',
	brand: 'brand',
	style: 'style',
	purchaseYear: 'purchase_year',
	internalName: 'internal_name',
	color: 'color',
	rentalCount: 'rental_count',
	size: 'size',
	purchasePrice: 'purchase_price',
	condition: 'condition',
	insuranceExpiryDate: 'insurance_expiry_date',
	insuranceProvider: 'insurance_provider',
	dressPhotoUrl: 'dress_photo_url',
	notes: 'notes',
	damageDescription: 'damage_description',
	damagePhotoUrls: 'damage_photo_urls',
	createdAt: 'created_at',
	updatedAt: 'updated_at',
};

async function getAllDressesByUserId(
	userId: string,
	connection?: Pool | PoolClient
): Promise<UserDress[]> {
	logger.info(`Getting all dresses for user '${userId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		`SELECT * FROM "user_dresses" WHERE user_id_fk = ? ORDER BY created_at DESC`
	);
	const result = await conn.query(query, [userId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return mapDressDbToObject(result.rows);
}

async function getDressById(
	dressId: number,
	connection?: Pool | PoolClient
): Promise<UserDress | null> {
	logger.info(`Getting dress with id '${dressId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'SELECT * FROM "user_dresses" WHERE id = ?'
	);
	const result = await conn.query(query, [dressId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		return null;
	}

	return mapDressDbToObject(result.rows)[0];
}

async function getDressByIdAndUserId(
	dressId: number,
	userId: string,
	connection?: Pool | PoolClient
): Promise<UserDress | null> {
	logger.info(
		`Getting dress with id '${dressId}' for user '${userId}' from the database`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'SELECT * FROM "user_dresses" WHERE id = ? AND user_id_fk = ?'
	);
	const result = await conn.query(query, [dressId, userId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		return null;
	}

	return mapDressDbToObject(result.rows)[0];
}

async function postDress(
	dressData: Omit<UserDress, 'id' | 'createdAt' | 'updatedAt'>,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info('Adding new dress to the database');

	const fields: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(dressData)) {
		if (value !== undefined) {
			fields.push(dressDbFields[key as keyof UserDress]);
			values.push(value);
		}
	}

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query =
		convertQueryPlaceholders(`INSERT INTO "user_dresses" (${fields.join(
			', '
		)})
                   VALUES (${fields.map(() => '?').join(', ')}) RETURNING id`);
	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function updateDressById(
	dressId: number,
	updateValues: Partial<
		Omit<UserDress, 'id' | 'userIdFk' | 'createdAt' | 'updatedAt'>
	>,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(`Updating dress with id '${dressId}' in the database`);

	if (Object.keys(updateValues).length === 0) {
		logger.error('Trying to update dress with no update values');
		throw new Error('Empty dress update fields');
	}

	const fields = [];
	const values = [];

	for (const [key, value] of Object.entries(updateValues)) {
		fields.push(`${dressDbFields[key as keyof UserDress]} = ?`);
		values.push(value);
	}

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		`UPDATE "user_dresses" SET ${fields.join(', ')} WHERE id = ?`
	);

	values.push(dressId);

	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function deleteDressById(
	dressId: number,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(`Deleting dress with id '${dressId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'DELETE FROM "user_dresses" WHERE id = ?'
	);
	const result = await conn.query(query, [dressId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

export {
	getAllDressesByUserId,
	getDressById,
	getDressByIdAndUserId,
	postDress,
	updateDressById,
	deleteDressById,
};
