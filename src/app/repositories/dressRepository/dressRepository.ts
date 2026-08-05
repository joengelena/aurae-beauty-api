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
	status: 'status',
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
	createdAt: 'created_at',
	updatedAt: 'updated_at',
};

// Correlated subquery — cheap at small-business scale, avoids a denormalized
// counter column that would need to stay in sync with damage incident CRUD.
const unresolvedDamageCountSelect = `(
	SELECT COUNT(*) FROM "dress_damage_incidents" ddi
	WHERE ddi.dress_id_fk = ud.id AND ddi.resolved = FALSE
) AS unresolved_damage_count`;

// Same pattern — surfaces renter self-bookings awaiting owner approve/decline
// so they're visible from the Wardrobe grid, not just inside the dress detail page.
const pendingBookingCountSelect = `(
	SELECT COUNT(*) FROM "dress_bookings" db
	WHERE db.dress_id_fk = ud.id AND db.status = 'pending'
) AS pending_booking_count`;

async function getAllDressesByUserId(
	userId: string,
	connection?: Pool | PoolClient
): Promise<(UserDress & { unresolvedDamageCount: number; pendingBookingCount: number })[]> {
	logger.info(`Getting all dresses for user '${userId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		`SELECT ud.*, ${unresolvedDamageCountSelect}, ${pendingBookingCountSelect} FROM "user_dresses" ud WHERE ud.user_id_fk = ? ORDER BY ud.created_at DESC`
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
): Promise<(UserDress & { unresolvedDamageCount: number; pendingBookingCount: number }) | null> {
	logger.info(`Getting dress with id '${dressId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		`SELECT ud.*, ${unresolvedDamageCountSelect}, ${pendingBookingCountSelect} FROM "user_dresses" ud WHERE ud.id = ?`
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
	priceDesc: 'rental_price_per_day DESC NULLS LAST',
	priceAsc: 'rental_price_per_day ASC NULLS LAST',
	uploadDateDesc: 'created_at DESC',
	uploadDateAsc: 'created_at ASC',
};

// Ranks sizes XXS..XXL first (mirrors the Flutter-side sizeRank in
// lib/utils/size_utils.dart), then numeric sizes by value, unknowns last.
const sizeRankCase = `CASE
	WHEN size = 'XXS' THEN 0 WHEN size = 'XS' THEN 1 WHEN size = 'S' THEN 2 WHEN size = 'M' THEN 3
	WHEN size = 'L' THEN 4 WHEN size = 'XL' THEN 5 WHEN size = 'XXL' THEN 6
	WHEN size ~ '^[0-9]+$' THEN 1000 + size::int
	ELSE 9999
END`;

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
	// When true, returns one row per user_dresses record (today's behavior) —
	// used by the Listing Detail page's size-variant switcher, which needs
	// every size row for a given (userId, brand, style) rather than one
	// representative row per group.
	ungrouped?: boolean;
};

async function getPublicDresses(
	limit: number,
	offset: number,
	filters: PublicDressFilters = {},
	connection?: Pool | PoolClient
): Promise<{ dresses: Partial<UserDress & { location: string; availableSizes: string[] }>[]; totalRows: number }> {
	logger.info('Getting public dresses from the database');

	const conn = connection || getPool();
	const { userId, startDate, endDate, search, sortBy, brand, style, dressType, size, color, condition, location, priceFrom, priceTo } = filters;

	const userClause = userId ? ' AND ud.user_id_fk = ?' : '';

	// Exclude dresses with overlapping non-cancelled/returned bookings (including
	// each booking's post-rental cleaning buffer) or overlapping manual blocks
	const availabilityClause = (startDate && endDate)
		? ` AND NOT EXISTS (
			SELECT 1 FROM "dress_bookings" db
			WHERE db.dress_id_fk = ud.id
			AND db.status NOT IN ('cancelled', 'returned')
			AND db.start_date <= ?
			AND (db.end_date + (INTERVAL '1 day' * COALESCE((b.business_settings->>'cleaningBufferDays')::int, 1)))::date >= ?
		  )
		  AND NOT EXISTS (
			SELECT 1 FROM jsonb_to_recordset(ud.blocked_date_ranges) AS br("startDate" date, "endDate" date)
			WHERE br."startDate" <= ? AND br."endDate" >= ?
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

	const dateParams = (startDate && endDate) ? [endDate, startDate, endDate, startDate] : [];
	const baseParams = userId ? [userId] : [];
	const searchParams = search ? [`%${search}%`, `%${search}%`] : [];
	const filterClause = `${equalFilterClause}${priceFilterClause}`;
	const filterParams = [...equalFilterParams, ...priceFilterParams];

	const filteredCte = `filtered AS (
		SELECT ud.id, ud.user_id_fk, ud.name, ud.brand, ud.style, ud.dress_type, ud.size, ud.color, ud.condition,
		       ud.listing_type, ud.is_public, ud.dress_photo_urls[1] as dress_photo_url, ud.rental_price_per_day, ud.created_at,
		       u.location
		FROM "user_dresses" ud
		JOIN "user" u ON ud.user_id_fk = u.id
		JOIN business b ON b.owner_user_id_fk = ud.user_id_fk
		WHERE ud.is_public = TRUE AND ud.status != 'sold'${userClause}${availabilityClause}${searchClause}${equalFilterClause}
	)`;
	const rankedCte = `ranked AS (
		SELECT filtered.*, ROW_NUMBER() OVER (PARTITION BY user_id_fk, brand, style ORDER BY ${sizeRankCase}, id ASC) AS rn
		FROM filtered
	)`;

	let countQuery: string;
	let mainQuery: string;

	if (filters.ungrouped) {
		countQuery = convertQueryPlaceholders(
			`SELECT COUNT(*) FROM "user_dresses" ud JOIN "user" u ON ud.user_id_fk = u.id JOIN business b ON b.owner_user_id_fk = ud.user_id_fk WHERE ud.is_public = TRUE AND ud.status != 'sold'${userClause}${availabilityClause}${searchClause}${filterClause}`
		);
		mainQuery = convertQueryPlaceholders(
			`SELECT ud.id, ud.user_id_fk, ud.name, ud.brand, ud.style, ud.dress_type, ud.size, ud.color, ud.condition,
			        ud.listing_type, ud.is_public, ud.dress_photo_urls[1] as dress_photo_url, ud.rental_price_per_day, ud.created_at,
			        u.location
			 FROM "user_dresses" ud
			 JOIN "user" u ON ud.user_id_fk = u.id
			 JOIN business b ON b.owner_user_id_fk = ud.user_id_fk
			 WHERE ud.is_public = TRUE AND ud.status != 'sold'${userClause}${availabilityClause}${searchClause}${filterClause}
			 ORDER BY ${orderByClause}
			 LIMIT ? OFFSET ?`
		);
	} else {
		countQuery = convertQueryPlaceholders(
			`WITH ${filteredCte}, ${rankedCte}
			 SELECT COUNT(*) FROM ranked WHERE rn = 1${priceFilterClause}`
		);
		mainQuery = convertQueryPlaceholders(
			`WITH ${filteredCte}, ${rankedCte},
			 sizes_agg AS (
				SELECT user_id_fk, brand, style, ARRAY_AGG(DISTINCT size) AS available_sizes
				FROM filtered
				GROUP BY user_id_fk, brand, style
			 )
			 SELECT ranked.id, ranked.user_id_fk, ranked.name, ranked.brand, ranked.style, ranked.dress_type, ranked.size,
			        ranked.color, ranked.condition, ranked.listing_type, ranked.is_public, ranked.dress_photo_url,
			        ranked.rental_price_per_day, ranked.created_at, ranked.location, sizes_agg.available_sizes
			 FROM ranked
			 JOIN sizes_agg ON sizes_agg.user_id_fk = ranked.user_id_fk AND sizes_agg.brand = ranked.brand AND sizes_agg.style = ranked.style
			 WHERE ranked.rn = 1${priceFilterClause}
			 ORDER BY ${orderByClause}
			 LIMIT ? OFFSET ?`
		);
	}

	const countParams = filters.ungrouped
		? [...baseParams, ...dateParams, ...searchParams, ...filterParams]
		: [...baseParams, ...dateParams, ...searchParams, ...equalFilterParams, ...priceFilterParams];
	const countResult = await conn.query(countQuery, countParams);
	const totalRows = parseInt(countResult.rows[0].count, 10);

	const mainParams = filters.ungrouped
		? [...baseParams, ...dateParams, ...searchParams, ...filterParams, limit, offset]
		: [...baseParams, ...dateParams, ...searchParams, ...equalFilterParams, ...priceFilterParams, limit, offset];
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
		availableSizes: row.available_sizes ?? [row.size],
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
		 WHERE ud.id = ? AND ud.is_public = TRUE AND ud.status != 'sold'`
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
