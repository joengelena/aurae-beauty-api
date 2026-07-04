import { Pool, PoolClient, QueryResult } from 'pg';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { UserDress } from '../../resources/types';
import mapDressDbToObject from './mapDressDbToObject';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

const dressDbFields: Record<keyof UserDress, string> = {
	id: 'id',
	userIdFk: 'user_id_fk',
	name: 'name',
	brand: 'brand',
	style: 'style',
	listingType: 'listing_type',
	isPublic: 'is_public',
	purchaseYear: 'purchase_year',
	internalName: 'internal_name',
	color: 'color',
	rentalCount: 'rental_count',
	size: 'size',
	purchasePrice: 'purchase_price',
	rentalPricePerDay: 'rental_price_per_day',
	condition: 'condition',
	dressPhotoUrls: 'dress_photo_urls',
	blockedDateRanges: 'blocked_date_ranges',
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
		if (key === 'blockedDateRanges') {
			fields.push(`${dressDbFields[key as keyof UserDress]} = ?::jsonb`);
			values.push(JSON.stringify(value));
		} else {
			fields.push(`${dressDbFields[key as keyof UserDress]} = ?`);
			values.push(value);
		}
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

async function getPublicDresses(
	limit: number,
	offset: number,
	userId?: string,
	startDate?: string,
	endDate?: string,
	connection?: Pool | PoolClient
): Promise<{ dresses: Partial<UserDress & { location: string }>[]; totalRows: number }> {
	logger.info('Getting public dresses from the database');

	const conn = connection || getPool();

	const userClause = userId ? ' AND ud.user_id_fk = ?' : '';

	// Exclude dresses with overlapping non-cancelled/returned bookings
	const availabilityClause = (startDate && endDate)
		? ` AND NOT EXISTS (
			SELECT 1 FROM "dress_bookings" db
			WHERE db.dress_id_fk = ud.id
			AND db.status NOT IN ('cancelled', 'returned')
			AND db.start_date <= ?
			AND db.end_date >= ?
		  )`
		: '';
	const dateParams = (startDate && endDate) ? [endDate, startDate] : [];

	const baseParams = userId ? [userId] : [];

	const countQuery = convertQueryPlaceholders(
		`SELECT COUNT(*) FROM "user_dresses" ud WHERE ud.is_public = TRUE${userClause}${availabilityClause}`
	);
	const countParams = [...baseParams, ...dateParams];
	const countResult = await conn.query(countQuery, countParams);
	const totalRows = parseInt(countResult.rows[0].count, 10);

	const mainQuery = convertQueryPlaceholders(
		`SELECT ud.id, ud.user_id_fk, ud.name, ud.brand, ud.style, ud.size, ud.color, ud.condition,
		        ud.listing_type, ud.is_public, ud.dress_photo_urls[1] as dress_photo_url, ud.rental_price_per_day, ud.created_at,
		        u.location
		 FROM "user_dresses" ud
		 JOIN "user" u ON ud.user_id_fk = u.id
		 WHERE ud.is_public = TRUE${userClause}${availabilityClause}
		 ORDER BY ud.created_at DESC
		 LIMIT ? OFFSET ?`
	);
	const mainParams = [...baseParams, ...dateParams, limit, offset];
	const result = await conn.query(mainQuery, mainParams);

	const dresses = result.rows.map((row: any) => ({
		id: row.id,
		userIdFk: row.user_id_fk,
		name: row.name ?? null,
		brand: row.brand,
		style: row.style,
		size: row.size,
		color: row.color,
		condition: row.condition,
		listingType: row.listing_type ?? 'rent',
		isPublic: row.is_public ?? false,
		dressPhotoUrl: row.dress_photo_url,
		rentalPricePerDay: row.rental_price_per_day,
		createdAt: row.created_at,
		location: row.location ?? '',
	}));

	return { dresses, totalRows };
}

async function getPublicDressById(
	dressId: number,
	connection?: Pool | PoolClient
): Promise<(UserDress & { location: string; imageUrls: string[] }) | null> {
	logger.info(`Getting public dress with id '${dressId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		`SELECT ud.*, u.location
		 FROM "user_dresses" ud
		 JOIN "user" u ON ud.user_id_fk = u.id
		 WHERE ud.id = ? AND ud.is_public = TRUE`
	);
	const result = await conn.query(query, [dressId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		return null;
	}

	const mapped = mapDressDbToObject(result.rows)[0];
	return {
		...mapped,
		location: result.rows[0].location ?? '',
		imageUrls: mapped.dressPhotoUrls ?? [],
	};
}

export {
	getAllDressesByUserId,
	getDressById,
	getDressByIdAndUserId,
	postDress,
	updateDressById,
	deleteDressById,
	getPublicDresses,
	getPublicDressById,
};
