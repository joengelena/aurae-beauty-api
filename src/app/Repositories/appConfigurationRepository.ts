import { RowDataPacket } from 'mysql2';
import { getPool } from '../../config/db';
import logger from '../../config/logger';
import { AppConfigurationDBSchema } from '../resources/databaseTypes';

async function getWebAppBaseUrl(): Promise<AppConfigurationDBSchema[]> {
	logger.info('Getting web app base url');

	const connection = await getPool().getConnection();
	const query =
		"SELECT * FROM app_configuration WHERE name = 'webAppBaseUrl'";
	const [result] = await connection.query<RowDataPacket[]>(query);
	connection.release();

	return result as AppConfigurationDBSchema[];
}

export { getWebAppBaseUrl };
