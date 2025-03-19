import { RowDataPacket } from 'mysql2';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { ListingFilters } from '../../resources/types';
import mapListingFiltersDbToObject from './mapListingFiltersDbToObject';

async function getListingFilters(): Promise<ListingFilters[]> {
	logger.info('Getting filters from the database');

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM listing_filters';
	const [result] = await connection.query<RowDataPacket[]>(query);
	connection.release();

	return mapListingFiltersDbToObject(result);
}

export { getListingFilters };
