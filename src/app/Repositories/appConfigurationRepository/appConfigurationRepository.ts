import { RowDataPacket } from 'mysql2';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { AppConfiguration } from '../../resources/types';
import mapAppConfigDbToObject from './mapAppConfigDbToObject';

async function getAppConfig(): Promise<AppConfiguration[]> {
	logger.info('Getting web app base url');

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM app_configuration';
	const [result] = await connection.query<RowDataPacket[]>(query);
	connection.release();

	return mapAppConfigDbToObject(result);
}

export { getAppConfig };
