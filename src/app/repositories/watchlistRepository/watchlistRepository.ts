import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { Pool, PoolClient, QueryResult } from 'pg';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

async function addToWatchlist(
	userId: string,
	listingId: number,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(
		`Adding watchlist to the database: userId ${userId} / listingId ${listingId}`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`INSERT INTO "watchlist"
        (user_id_fk, dress_id_fk) VALUES
        (?, ?)`);
	const result = await conn.query(query, [
		userId,
		listingId,
	]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function removeFromWatchlist(
	userId: string,
	listingId: number,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(
		`Removing watchlist from the database: userId ${userId} / listingId ${listingId}`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'DELETE FROM "watchlist" WHERE user_id_fk = ? AND dress_id_fk = ?');
	const result = await conn.query(query, [
		userId,
		listingId,
	]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function getUserWatchlist(userId: string): Promise<any[]> {
	logger.info(`Getting watchlist from the database: userId ${userId}`);

	const connection = getPool();
	const query = convertQueryPlaceholders(`
		SELECT
			ud.id,
			ud.user_id_fk,
			ud.name,
			ud.brand,
			ud.style,
			ud.size,
			ud.color,
			ud.condition,
			ud.listing_type,
			ud.dress_photo_urls[1] as dress_photo_url,
			ud.rental_price_per_day,
			ud.created_at,
			u.location,
			MAX(w.added_at) as added_at
		FROM "watchlist" w
		INNER JOIN "user_dresses" ud ON w.dress_id_fk = ud.id
		INNER JOIN "user" u ON ud.user_id_fk = u.id
		WHERE w.user_id_fk = ?
		GROUP BY ud.id, u.location
		ORDER BY MAX(w.added_at) DESC
	`);

	const result = await connection.query(query, [userId]);

	return result.rows.map(row => ({
		id: row.id,
		userIdFk: row.user_id_fk,
		name: row.name ?? null,
		brand: row.brand,
		style: row.style,
		size: row.size,
		color: row.color ?? null,
		condition: row.condition,
		listingType: row.listing_type,
		dressPhotoUrl: row.dress_photo_url ?? '',
		rentalPricePerDay: row.rental_price_per_day ?? 0,
		createdAt: row.created_at,
		location: row.location ?? '',
		isInWatchlist: 1,
	}));
}

export { addToWatchlist, removeFromWatchlist, getUserWatchlist };
