import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { Pool, PoolClient, QueryResult } from 'pg';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';
import mapListingsDbToObject from '../listingRepository/mapListingsDbToObject';

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
			l.*,
			COALESCE(json_agg(lp.photo_path ORDER BY lp.photo_order), '[]'::json) AS image_urls,
			MAX(w.added_at) as added_at
		FROM "watchlist" w
		INNER JOIN "dress" l ON w.dress_id_fk = l.id
		LEFT JOIN "dress_photo" lp ON l.id = lp.dress_id_fk
		WHERE w.user_id_fk = ?
		GROUP BY l.id
		ORDER BY MAX(w.added_at) DESC
	`);

	const result = await connection.query(query, [userId]);

	return mapListingsDbToObject(result.rows);
}

export { addToWatchlist, removeFromWatchlist, getUserWatchlist };
