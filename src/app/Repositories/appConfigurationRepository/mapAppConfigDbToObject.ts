import { RowDataPacket } from 'mysql2';
import { AppConfiguration } from '../../resources/types';

function mapAppConfigDbToObject(
	appConfigDb: RowDataPacket[]
): AppConfiguration[] {
	return appConfigDb.map((appConfig) => {
		return {
			id: appConfig.id,
			name: appConfig.name,
			value: appConfig.value,
		};
	});
}

export default mapAppConfigDbToObject;
