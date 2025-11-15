import { DeviceToken } from '../../resources/types';
import { RowDataPacket } from 'mysql2';

function mapDeviceTokenDbToObject(deviceTokensDb: RowDataPacket[]): DeviceToken[] {
	return deviceTokensDb.map((token) => {
		return {
			id: token.id,
			userIdFk: token.user_id_fk,
			token: token.token,
			platform: token.platform,
			deviceName: token.device_name,
			isActive: token.is_active,
			lastUsedAt: token.last_used_at,
			createdAt: token.created_at,
		};
	});
}

export default mapDeviceTokenDbToObject;
