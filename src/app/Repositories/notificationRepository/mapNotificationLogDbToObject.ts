import { NotificationLog } from '../../resources/types';
import { RowDataPacket } from 'mysql2';

function mapNotificationLogDbToObject(notificationLogsDb: RowDataPacket[]): NotificationLog[] {
	return notificationLogsDb.map((log) => {
		return {
			id: log.id,
			userIdFk: log.user_id_fk,
			vehicleIdFk: log.vehicle_id_fk,
			serviceReminderIdFk: log.service_reminder_id_fk,
			notificationType: log.notification_type,
			title: log.title,
			message: log.message,
			sentAt: log.sent_at,
			readAt: log.read_at,
			dismissedAt: log.dismissed_at,
			platform: log.platform,
		};
	});
}

export default mapNotificationLogDbToObject;
