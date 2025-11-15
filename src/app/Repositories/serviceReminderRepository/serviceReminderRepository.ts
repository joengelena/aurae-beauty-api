import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { ServiceReminder } from '../../resources/types';
import mapServiceReminderDbToObject from './mapServiceReminderDbToObject';

const serviceReminderDbFields: Record<keyof ServiceReminder, string> = {
	id: 'id',
	vehicleIdFk: 'vehicle_id_fk',
	reminderName: 'reminder_name',
	description: 'description',
	dueDate: 'due_date',
	dueMileage: 'due_mileage',
	notifyDaysBefore: 'notify_days_before',
	notifyKmBefore: 'notify_km_before',
	isRecurring: 'is_recurring',
	recurrenceIntervalMonths: 'recurrence_interval_months',
	recurrenceIntervalKm: 'recurrence_interval_km',
	isActive: 'is_active',
	completedAt: 'completed_at',
	createdAt: 'created_at',
	updatedAt: 'updated_at',
};

async function getAllRemindersByVehicleId(
	vehicleId: number,
	status?: 'active' | 'inactive' | 'all'
): Promise<ServiceReminder[]> {
	logger.info(`Getting reminders for vehicle '${vehicleId}' from the database`);

	const connection = await getPool().getConnection();

	let query = 'SELECT * FROM service_reminders WHERE vehicle_id_fk = ?';
	const params: any[] = [vehicleId];

	if (status === 'active') {
		query += ' AND is_active = 1';
	} else if (status === 'inactive') {
		query += ' AND is_active = 0';
	}

	query += ' ORDER BY due_date ASC, due_mileage ASC';

	const [result] = await connection.query<RowDataPacket[]>(query, params);
	connection.release();

	return mapServiceReminderDbToObject(result);
}

async function getReminderById(reminderId: number): Promise<ServiceReminder | null> {
	logger.info(`Getting reminder with id '${reminderId}' from the database`);

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM service_reminders WHERE id = ?';
	const [result] = await connection.query<RowDataPacket[]>(query, [reminderId]);
	connection.release();

	if (result.length === 0) {
		return null;
	}

	return mapServiceReminderDbToObject(result)[0];
}

async function postReminder(
	reminderData: Omit<ServiceReminder, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ResultSetHeader> {
	logger.info('Adding new service reminder to the database');

	const fields: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(reminderData)) {
		if (value !== undefined) {
			fields.push(serviceReminderDbFields[key as keyof ServiceReminder]);
			values.push(value);
		}
	}

	const connection = await getPool().getConnection();
	const query = `INSERT INTO service_reminders (${fields.join(', ')})
                   VALUES (${fields.map(() => '?').join(', ')})`;
	const [result] = await connection.query<ResultSetHeader>(query, values);
	connection.release();

	return result;
}

async function updateReminderById(
	reminderId: number,
	updateValues: Partial<Omit<ServiceReminder, 'id' | 'vehicleIdFk' | 'createdAt' | 'updatedAt'>>
): Promise<ResultSetHeader> {
	logger.info(`Updating reminder with id '${reminderId}' in the database`);

	if (Object.keys(updateValues).length === 0) {
		logger.error('Trying to update reminder with no update values');
		throw new Error('Empty reminder update fields');
	}

	const fields: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(updateValues)) {
		if (value !== undefined) {
			fields.push(`${serviceReminderDbFields[key as keyof ServiceReminder]} = ?`);
			values.push(value);
		}
	}

	values.push(reminderId);

	const connection = await getPool().getConnection();
	const query = `UPDATE service_reminders SET ${fields.join(', ')} WHERE id = ?`;
	const [result] = await connection.query<ResultSetHeader>(query, values);
	connection.release();

	return result;
}

async function deleteReminderById(reminderId: number): Promise<ResultSetHeader> {
	logger.info(`Deleting reminder with id '${reminderId}' from the database`);

	const connection = await getPool().getConnection();
	const query = 'DELETE FROM service_reminders WHERE id = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [reminderId]);
	connection.release();

	return result;
}

async function completeReminder(reminderId: number): Promise<ResultSetHeader> {
	logger.info(`Marking reminder with id '${reminderId}' as completed`);

	const connection = await getPool().getConnection();
	const query = 'UPDATE service_reminders SET completed_at = NOW() WHERE id = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [reminderId]);
	connection.release();

	return result;
}

async function toggleReminderStatus(
	reminderId: number,
	isActive: 0 | 1
): Promise<ResultSetHeader> {
	logger.info(`Toggling reminder ${reminderId} status to ${isActive ? 'active' : 'inactive'}`);

	const connection = await getPool().getConnection();
	const query = 'UPDATE service_reminders SET is_active = ? WHERE id = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [isActive, reminderId]);
	connection.release();

	return result;
}

async function getUpcomingRemindersByUserId(
	userId: string,
	daysAhead: number
): Promise<ServiceReminder[]> {
	logger.info(
		`Getting upcoming reminders in next ${daysAhead} days for user '${userId}'`
	);

	const connection = await getPool().getConnection();
	const query = `
		SELECT sr.* FROM service_reminders sr
		INNER JOIN user_vehicles uv ON sr.vehicle_id_fk = uv.id
		WHERE uv.user_id_fk = ?
		AND sr.is_active = 1
		AND sr.due_date IS NOT NULL
		AND sr.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
		ORDER BY sr.due_date ASC
	`;
	const [result] = await connection.query<RowDataPacket[]>(query, [userId, daysAhead]);
	connection.release();

	return mapServiceReminderDbToObject(result);
}

async function getDueRemindersByMileage(
	vehicleId: number,
	currentMileage: number,
	kmThreshold: number
): Promise<ServiceReminder[]> {
	logger.info(
		`Getting reminders due by mileage for vehicle '${vehicleId}' at ${currentMileage}km`
	);

	const connection = await getPool().getConnection();
	const query = `
		SELECT * FROM service_reminders
		WHERE vehicle_id_fk = ?
		AND is_active = 1
		AND due_mileage IS NOT NULL
		AND due_mileage <= ?
		AND due_mileage >= ?
		ORDER BY due_mileage ASC
	`;
	const [result] = await connection.query<RowDataPacket[]>(query, [
		vehicleId,
		currentMileage + kmThreshold,
		currentMileage,
	]);
	connection.release();

	return mapServiceReminderDbToObject(result);
}

export {
	getAllRemindersByVehicleId,
	getReminderById,
	postReminder,
	updateReminderById,
	deleteReminderById,
	completeReminder,
	toggleReminderStatus,
	getUpcomingRemindersByUserId,
	getDueRemindersByMileage,
};
