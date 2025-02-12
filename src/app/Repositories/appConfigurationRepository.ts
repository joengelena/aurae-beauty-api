import { RowDataPacket } from 'mysql2';
import { getPool } from '../../config/db';
import logger from '../../config/logger';
import { AppConfigurationDBSchema } from '../resources/types';

async function getAppConfig(): Promise<AppConfigurationDBSchema[]> {
	logger.info('Getting web app base url');

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM app_configuration';
	const [result] = await connection.query<RowDataPacket[]>(query);
	connection.release();

	return result as AppConfigurationDBSchema[];
}

export { getAppConfig };
