import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import {
	NotificationPreferences,
	DeviceToken,
	NotificationLog,
} from '../../resources/types';
import mapDeviceTokenDbToObject from './mapDeviceTokenDbToObject';
import mapNotificationLogDbToObject from './mapNotificationLogDbToObject';

// ===== Notification Preferences =====

async function getNotificationPreferencesByUserId(
	userId: string
): Promise<NotificationPreferences | null> {
	logger.info(`Getting notification preferences for user '${userId}'`);

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM notification_preferences WHERE user_id_fk = ?';
	const [result] = await connection.query<RowDataPacket[]>(query, [userId]);
	connection.release();

	if (result.length === 0) {
		return null;
	}

	const prefs = result[0] as any;

	// Parse JSON arrays if they exist
	if (prefs.rego_remind_at_days && typeof prefs.rego_remind_at_days === 'string') {
		prefs.regoRemindAtDays = JSON.parse(prefs.rego_remind_at_days);
	} else {
		prefs.regoRemindAtDays = prefs.rego_remind_at_days;
	}

	if (prefs.wof_remind_at_days && typeof prefs.wof_remind_at_days === 'string') {
		prefs.wofRemindAtDays = JSON.parse(prefs.wof_remind_at_days);
	} else {
		prefs.wofRemindAtDays = prefs.wof_remind_at_days;
	}

	return {
		userIdFk: prefs.user_id_fk,
		regoRemindAtDays: prefs.regoRemindAtDays,
		wofRemindAtDays: prefs.wofRemindAtDays,
		pushEnabled: prefs.push_enabled,
		emailEnabled: prefs.email_enabled,
		notificationTime: prefs.notification_time,
		timezone: prefs.timezone,
		createdAt: prefs.created_at,
		updatedAt: prefs.updated_at,
	} as NotificationPreferences;
}

async function createNotificationPreferences(
	userId: string,
	regoRemindDays: number[] = [30, 14, 7, 1],
	wofRemindDays: number[] = [30, 14, 7, 1]
): Promise<ResultSetHeader> {
	logger.info(`Creating default notification preferences for user '${userId}'`);

	const connection = await getPool().getConnection();
	const query = `
		INSERT INTO notification_preferences
		(user_id_fk, rego_remind_at_days, wof_remind_at_days, push_enabled, email_enabled)
		VALUES (?, ?, ?, 1, 0)
	`;
	const [result] = await connection.query<ResultSetHeader>(query, [
		userId,
		JSON.stringify(regoRemindDays),
		JSON.stringify(wofRemindDays),
	]);
	connection.release();

	return result;
}

async function updateNotificationPreferences(
	userId: string,
	updateValues: Partial<Omit<NotificationPreferences, 'userIdFk' | 'createdAt' | 'updatedAt'>>
): Promise<ResultSetHeader> {
	logger.info(`Updating notification preferences for user '${userId}'`);

	if (Object.keys(updateValues).length === 0) {
		logger.error('Trying to update notification preferences with no values');
		throw new Error('Empty notification preferences update fields');
	}

	const fields: string[] = [];
	const values: any[] = [];

	// Map camelCase to snake_case and handle JSON serialization
	const fieldMap: Record<string, string> = {
		regoRemindAtDays: 'rego_remind_at_days',
		wofRemindAtDays: 'wof_remind_at_days',
		pushEnabled: 'push_enabled',
		emailEnabled: 'email_enabled',
		notificationTime: 'notification_time',
		timezone: 'timezone',
	};

	for (const [key, value] of Object.entries(updateValues)) {
		if (value !== undefined) {
			const dbField = fieldMap[key];
			fields.push(`${dbField} = ?`);

			// Serialize arrays to JSON
			if (key === 'regoRemindAtDays' || key === 'wofRemindAtDays') {
				values.push(JSON.stringify(value));
			} else {
				values.push(value);
			}
		}
	}

	values.push(userId);

	const connection = await getPool().getConnection();
	const query = `UPDATE notification_preferences SET ${fields.join(', ')} WHERE user_id_fk = ?`;
	const [result] = await connection.query<ResultSetHeader>(query, values);
	connection.release();

	return result;
}

// ===== Device Tokens =====

async function getAllDeviceTokensByUserId(userId: string): Promise<DeviceToken[]> {
	logger.info(`Getting all device tokens for user '${userId}'`);

	const connection = await getPool().getConnection();
	const query = `
		SELECT * FROM device_tokens
		WHERE user_id_fk = ?
		ORDER BY last_used_at DESC
	`;
	const [result] = await connection.query<RowDataPacket[]>(query, [userId]);
	connection.release();

	return mapDeviceTokenDbToObject(result);
}

async function getDeviceTokenById(tokenId: number): Promise<DeviceToken | null> {
	logger.info(`Getting device token with id '${tokenId}'`);

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM device_tokens WHERE id = ?';
	const [result] = await connection.query<RowDataPacket[]>(query, [tokenId]);
	connection.release();

	if (result.length === 0) {
		return null;
	}

	return mapDeviceTokenDbToObject(result)[0];
}

async function registerDeviceToken(
	userId: string,
	token: string,
	platform: string,
	deviceName?: string
): Promise<ResultSetHeader> {
	logger.info(`Registering device token for user '${userId}'`);

	const connection = await getPool().getConnection();

	// Check if token already exists
	const checkQuery = 'SELECT id FROM device_tokens WHERE token = ?';
	const [existing] = await connection.query<RowDataPacket[]>(checkQuery, [token]);

	if (existing.length > 0) {
		// Update existing token
		const updateQuery = `
			UPDATE device_tokens
			SET user_id_fk = ?, platform = ?, device_name = ?, is_active = 1, last_used_at = NOW()
			WHERE token = ?
		`;
		const [result] = await connection.query<ResultSetHeader>(updateQuery, [
			userId,
			platform,
			deviceName || null,
			token,
		]);
		connection.release();
		return result;
	}

	// Insert new token
	const insertQuery = `
		INSERT INTO device_tokens (user_id_fk, token, platform, device_name)
		VALUES (?, ?, ?, ?)
	`;
	const [result] = await connection.query<ResultSetHeader>(insertQuery, [
		userId,
		token,
		platform,
		deviceName || null,
	]);
	connection.release();

	return result;
}

async function deleteDeviceTokenById(tokenId: number): Promise<ResultSetHeader> {
	logger.info(`Deleting device token with id '${tokenId}'`);

	const connection = await getPool().getConnection();
	const query = 'DELETE FROM device_tokens WHERE id = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [tokenId]);
	connection.release();

	return result;
}

async function getActiveDeviceTokensByUserId(userId: string): Promise<DeviceToken[]> {
	logger.info(`Getting active device tokens for user '${userId}'`);

	const connection = await getPool().getConnection();
	const query = `
		SELECT * FROM device_tokens
		WHERE user_id_fk = ? AND is_active = 1
		ORDER BY last_used_at DESC
	`;
	const [result] = await connection.query<RowDataPacket[]>(query, [userId]);
	connection.release();

	return mapDeviceTokenDbToObject(result);
}

// ===== Notification Logs =====

async function createNotificationLog(
	logData: Omit<NotificationLog, 'id' | 'sentAt'>
): Promise<ResultSetHeader> {
	logger.info(`Creating notification log for user '${logData.userIdFk}'`);

	const connection = await getPool().getConnection();
	const query = `
		INSERT INTO notification_logs
		(user_id_fk, vehicle_id_fk, service_reminder_id_fk, notification_type, title, message, platform)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`;
	const [result] = await connection.query<ResultSetHeader>(query, [
		logData.userIdFk,
		logData.vehicleIdFk || null,
		logData.serviceReminderIdFk || null,
		logData.notificationType,
		logData.title || null,
		logData.message || null,
		logData.platform || null,
	]);
	connection.release();

	return result;
}

async function getNotificationLogsByUserId(
	userId: string,
	limit: number = 50,
	offset: number = 0
): Promise<{ data: NotificationLog[]; total: number }> {
	logger.info(`Getting notification logs for user '${userId}'`);

	const connection = await getPool().getConnection();

	// Get total count
	const countQuery = 'SELECT COUNT(*) as total FROM notification_logs WHERE user_id_fk = ?';
	const [countResult] = await connection.query<RowDataPacket[]>(countQuery, [userId]);
	const total = countResult[0].total;

	// Get paginated data
	const dataQuery = `
		SELECT * FROM notification_logs
		WHERE user_id_fk = ?
		ORDER BY sent_at DESC
		LIMIT ? OFFSET ?
	`;
	const [dataResult] = await connection.query<RowDataPacket[]>(dataQuery, [
		userId,
		limit,
		offset,
	]);

	connection.release();

	return {
		data: mapNotificationLogDbToObject(dataResult),
		total,
	};
}

export {
	// Notification Preferences
	getNotificationPreferencesByUserId,
	createNotificationPreferences,
	updateNotificationPreferences,
	// Device Tokens
	getAllDeviceTokensByUserId,
	getDeviceTokenById,
	registerDeviceToken,
	deleteDeviceTokenById,
	getActiveDeviceTokensByUserId,
	// Notification Logs
	createNotificationLog,
	getNotificationLogsByUserId,
};
