import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { Pool, PoolClient, QueryResult } from 'pg';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

async function addToCart(
	userId: string,
	dressId: number,
	startDate: string,
	endDate: string,
	pricePerDay: number,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(
		`Adding cart item to the database: userId ${userId} / dressId ${dressId}`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`INSERT INTO "cart_items"
        (user_id_fk, dress_id_fk, start_date, end_date, price_per_day) VALUES
        (?, ?, ?, ?, ?) RETURNING id`);
	const result = await conn.query(query, [
		userId,
		dressId,
		startDate,
		endDate,
		pricePerDay,
	]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

// The cart is not a booking, so two lines for the same dress over the same days
// both pass the availability check — and then only the first survives checkout.
// Compared against the cleaning buffer as well, since back-to-back lines collide
// on turnaround the same way two bookings would.
async function hasOverlappingCartItem(
	userId: string,
	dressId: number,
	startDate: string,
	endDate: string,
	connection?: Pool | PoolClient
): Promise<boolean> {
	logger.info(
		`Checking cart overlap: userId ${userId} / dressId ${dressId}`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`
		SELECT 1 FROM "cart_items" ci
		JOIN "user_dresses" ud ON ud.id = ci.dress_id_fk
		JOIN business b ON b.owner_user_id_fk = ud.user_id_fk
		WHERE ci.user_id_fk = ?
		  AND ci.dress_id_fk = ?
		  AND ci.start_date <= ?
		  AND (ci.end_date + (INTERVAL '1 day' * COALESCE((b.business_settings->>'cleaningBufferDays')::int, 1)))::date >= ?
		LIMIT 1
	`);
	const result = await conn.query(query, [userId, dressId, endDate, startDate]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result.rows.length > 0;
}

async function removeFromCart(
	userId: string,
	cartItemId: number,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(
		`Removing cart item from the database: userId ${userId} / cartItemId ${cartItemId}`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'DELETE FROM "cart_items" WHERE id = ? AND user_id_fk = ?');
	const result = await conn.query(query, [
		cartItemId,
		userId,
	]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function getUserCart(userId: string): Promise<any[]> {
	logger.info(`Getting cart from the database: userId ${userId}`);

	const connection = getPool();
	const query = convertQueryPlaceholders(`
		SELECT
			ci.id,
			ci.dress_id_fk,
			ci.start_date,
			ci.end_date,
			ci.price_per_day,
			ci.created_at,
			ud.name,
			ud.brand,
			ud.style,
			ud.size,
			ud.dress_photo_urls[1] as dress_photo_url,
			u.location
		FROM "cart_items" ci
		INNER JOIN "user_dresses" ud ON ci.dress_id_fk = ud.id
		INNER JOIN "user" u ON ud.user_id_fk = u.id
		WHERE ci.user_id_fk = ?
		ORDER BY ci.created_at DESC
	`);

	const result = await connection.query(query, [userId]);

	return result.rows.map(row => ({
		id: row.id,
		dressIdFk: row.dress_id_fk,
		startDate: row.start_date,
		endDate: row.end_date,
		pricePerDay: row.price_per_day,
		createdAt: row.created_at,
		name: row.name ?? null,
		brand: row.brand,
		style: row.style,
		size: row.size,
		dressPhotoUrl: row.dress_photo_url ?? '',
		location: row.location ?? '',
	}));
}

export { addToCart, hasOverlappingCartItem, removeFromCart, getUserCart };
