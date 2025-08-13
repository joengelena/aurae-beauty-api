import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { ResultSetHeader } from 'mysql2';

async function addToWatchlist(
	userId: string,
	listingId: number
): Promise<ResultSetHeader> {
	logger.info(
		`Adding watchlist to the database: userId ${userId} / listingId ${listingId}`
	);

	const connection = await getPool().getConnection();
	const query = `INSERT INTO watchlist
        (user_id_fk, listing_id_fk) VALUES
        (?, ?)`;
	const [result] = await connection.query<ResultSetHeader>(query, [
		userId,
		listingId,
	]);
	connection.release();

	return result;
}

async function removeFromWatchlist(
	userId: string,
	listingId: number
): Promise<ResultSetHeader> {
	logger.info(
		`Removing watchlist from the database: userId ${userId} / listingId ${listingId}`
	);

	const connection = await getPool().getConnection();
	const query =
		'DELETE FROM watchlist WHERE user_id_fk = ? AND listing_id_fk = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [
		userId,
		listingId,
	]);
	connection.release();

	return result;
}

export { addToWatchlist, removeFromWatchlist };
