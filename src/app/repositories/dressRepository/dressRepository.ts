import { Pool, PoolClient, QueryResult } from 'pg';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { ListingAttribute, UserDress } from '../../resources/types';
import mapDressDbToObject from './mapDressDbToObject';
import mapDressAttributesDbToObject from './mapDressAttributesDbToObject';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

const dressDbFields: Record<keyof UserDress, string> = {
	id: 'id',
	userIdFk: 'user_id_fk',
	name: 'name',
	brand: 'brand',
	style: 'style',
	dressType: 'dress_type',
	listingType: 'listing_type',
	isPublic: 'is_public',
	purchaseYear: 'purchase_year',
	internalName: 'internal_name',
	color: 'color',
	rentalCount: 'rental_count',
	size: 'size',
	fitNote: 'fit_note',
	recommendedSizes: 'recommended_sizes',
	purchasePrice: 'purchase_price',
	rentalPricePerDay: 'rental_price_per_day',
	availableFrom: 'available_from',
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

// Sort values are never interpolated from user input directly — only these
// whitelisted SQL fragments can end up in the ORDER BY clause.
const publicDressSortOptions: Record<string, string> = {
	priceDesc: 'ud.rental_price_per_day DESC NULLS LAST',
	priceAsc: 'ud.rental_price_per_day ASC NULLS LAST',
	uploadDateDesc: 'ud.created_at DESC',
	uploadDateAsc: 'ud.created_at ASC',
};

type PublicDressFilters = {
	userId?: string;
	startDate?: string;
	endDate?: string;
	search?: string;
	sortBy?: string;
	brand?: string;
	style?: string;
	dressType?: string;
	size?: string;
	color?: string;
	condition?: string;
	location?: string;
	priceFrom?: string;
	priceTo?: string;
};

async function getPublicDresses(
	limit: number,
	offset: number,
	filters: PublicDressFilters = {},
	connection?: Pool | PoolClient
): Promise<{ dresses: Partial<UserDress & { location: string }>[]; totalRows: number }> {
	logger.info('Getting public dresses from the database');

	const conn = connection || getPool();
	const { userId, startDate, endDate, search, sortBy, brand, style, dressType, size, color, condition, location, priceFrom, priceTo } = filters;

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
	const searchClause = search ? ' AND (ud.name ILIKE ? OR ud.brand ILIKE ?)' : '';
	const orderByClause = publicDressSortOptions[sortBy ?? ''] ?? publicDressSortOptions.uploadDateDesc;

	// Equal-match filters: column is always one of these hardcoded strings,
	// only the value (bound via ?) comes from the request.
	const equalFilters: { column: string; value?: string }[] = [
		{ column: 'ud.brand', value: brand },
		{ column: 'ud.style', value: style },
		{ column: 'ud.dress_type', value: dressType },
		{ column: 'ud.size', value: size },
		{ column: 'ud.color', value: color },
		{ column: 'ud.condition', value: condition },
		{ column: 'u.location', value: location },
	];
	const equalFilterParts = equalFilters.filter((f) => !!f.value).map((f) => `${f.column} = ?`);
	const equalFilterClause = equalFilterParts.length ? ` AND ${equalFilterParts.join(' AND ')}` : '';
	const equalFilterParams = equalFilters.filter((f) => !!f.value).map((f) => f.value as string);

	const priceFilterParts: string[] = [];
	const priceFilterParams: string[] = [];
	if (priceFrom) {
		priceFilterParts.push('ud.rental_price_per_day >= ?');
		priceFilterParams.push(priceFrom);
	}
	if (priceTo) {
		priceFilterParts.push('ud.rental_price_per_day <= ?');
		priceFilterParams.push(priceTo);
	}
	const priceFilterClause = priceFilterParts.length ? ` AND ${priceFilterParts.join(' AND ')}` : '';

	const dateParams = (startDate && endDate) ? [endDate, startDate] : [];
	const baseParams = userId ? [userId] : [];
	const searchParams = search ? [`%${search}%`, `%${search}%`] : [];
	const filterClause = `${equalFilterClause}${priceFilterClause}`;
	const filterParams = [...equalFilterParams, ...priceFilterParams];

	const countQuery = convertQueryPlaceholders(
		`SELECT COUNT(*) FROM "user_dresses" ud JOIN "user" u ON ud.user_id_fk = u.id WHERE ud.is_public = TRUE${userClause}${availabilityClause}${searchClause}${filterClause}`
	);
	const countParams = [...baseParams, ...dateParams, ...searchParams, ...filterParams];
	const countResult = await conn.query(countQuery, countParams);
	const totalRows = parseInt(countResult.rows[0].count, 10);

	const mainQuery = convertQueryPlaceholders(
		`SELECT ud.id, ud.user_id_fk, ud.name, ud.brand, ud.style, ud.dress_type, ud.size, ud.color, ud.condition,
		        ud.listing_type, ud.is_public, ud.dress_photo_urls[1] as dress_photo_url, ud.rental_price_per_day, ud.created_at,
		        u.location
		 FROM "user_dresses" ud
		 JOIN "user" u ON ud.user_id_fk = u.id
		 WHERE ud.is_public = TRUE${userClause}${availabilityClause}${searchClause}${filterClause}
		 ORDER BY ${orderByClause}
		 LIMIT ? OFFSET ?`
	);
	const mainParams = [...baseParams, ...dateParams, ...searchParams, ...filterParams, limit, offset];
	const result = await conn.query(mainQuery, mainParams);

	const dresses = result.rows.map((row: any) => ({
		id: row.id,
		userIdFk: row.user_id_fk,
		name: row.name ?? null,
		brand: row.brand,
		style: row.style,
		dressType: row.dress_type ?? null,
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

async function getDressAttributes(): Promise<ListingAttribute[]> {
	logger.info('Getting dress attributes from the database');

	const connection = getPool();
	const query = convertQueryPlaceholders('SELECT * FROM "dress_attribute"');
	const result = await connection.query(query);

	return mapDressAttributesDbToObject(result.rows);
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
	getDressAttributes,
};
