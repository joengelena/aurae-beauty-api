import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import mysql from 'mysql2/promise';
import mapListingsDbToObject from '../listingRepository/mapListingsDbToObject';

async function addToWatchlist(
	userId: string,
	listingId: number,
	connection?: mysql.Pool | mysql.PoolConnection
): Promise<ResultSetHeader> {
	logger.info(
		`Adding watchlist to the database: userId ${userId} / listingId ${listingId}`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || (await getPool().getConnection());
	const query = `INSERT INTO watchlist
        (user_id_fk, listing_id_fk) VALUES
        (?, ?)`;
	const [result] = await conn.query<ResultSetHeader>(query, [
		userId,
		listingId,
	]);

	if (!useProvidedConnection) {
		(conn as mysql.PoolConnection).release();
	}

	return result;
}

async function removeFromWatchlist(
	userId: string,
	listingId: number,
	connection?: mysql.Pool | mysql.PoolConnection
): Promise<ResultSetHeader> {
	logger.info(
		`Removing watchlist from the database: userId ${userId} / listingId ${listingId}`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || (await getPool().getConnection());
	const query =
		'DELETE FROM watchlist WHERE user_id_fk = ? AND listing_id_fk = ?';
	const [result] = await conn.query<ResultSetHeader>(query, [
		userId,
		listingId,
	]);

	if (!useProvidedConnection) {
		(conn as mysql.PoolConnection).release();
	}

	return result;
}

async function getUserWatchlist(userId: string): Promise<any[]> {
	logger.info(`Getting watchlist from the database: userId ${userId}`);

	const connection = await getPool().getConnection();
	const query = `
		SELECT
			l.*,
			COALESCE(JSON_ARRAYAGG(lp.photo_path), JSON_ARRAY()) AS image_urls
		FROM watchlist w
		INNER JOIN listing l ON w.listing_id_fk = l.id
		LEFT JOIN (
			SELECT * FROM listing_photo ORDER BY photo_order
		) lp ON l.id = lp.listing_id_fk
		WHERE w.user_id_fk = ?
		GROUP BY l.id
		ORDER BY w.added_at DESC
	`;

	const [rows] = await connection.query<RowDataPacket[]>(query, [userId]);
	connection.release();

	return mapListingsDbToObject(rows);
}

export { addToWatchlist, removeFromWatchlist, getUserWatchlist };
