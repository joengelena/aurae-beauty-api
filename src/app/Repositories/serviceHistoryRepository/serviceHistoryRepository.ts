import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { ServiceHistory } from '../../resources/types';
import mapServiceHistoryDbToObject from './mapServiceHistoryDbToObject';

const serviceHistoryDbFields: Record<keyof ServiceHistory, string> = {
	id: 'id',
	vehicleIdFk: 'vehicle_id_fk',
	serviceType: 'service_type',
	serviceName: 'service_name',
	serviceDate: 'service_date',
	odometerAtService: 'odometer_at_service',
	serviceProviderName: 'service_provider_name',
	serviceProviderContact: 'service_provider_contact',
	cost: 'cost',
	receiptUrl: 'receipt_url',
	notes: 'notes',
	createdAt: 'created_at',
	updatedAt: 'updated_at',
};

async function getAllServiceHistoryByVehicleId(
	vehicleId: number,
	limit: number = 50,
	offset: number = 0
): Promise<{ data: ServiceHistory[]; total: number }> {
	logger.info(`Getting service history for vehicle '${vehicleId}' from the database`);

	const connection = await getPool().getConnection();

	// Get total count
	const countQuery = 'SELECT COUNT(*) as total FROM service_history WHERE vehicle_id_fk = ?';
	const [countResult] = await connection.query<RowDataPacket[]>(countQuery, [vehicleId]);
	const total = countResult[0].total;

	// Get paginated data
	const dataQuery = `
		SELECT * FROM service_history
		WHERE vehicle_id_fk = ?
		ORDER BY service_date DESC, created_at DESC
		LIMIT ? OFFSET ?
	`;
	const [dataResult] = await connection.query<RowDataPacket[]>(dataQuery, [
		vehicleId,
		limit,
		offset,
	]);

	connection.release();

	return {
		data: mapServiceHistoryDbToObject(dataResult),
		total,
	};
}

async function getServiceRecordById(recordId: number): Promise<ServiceHistory | null> {
	logger.info(`Getting service record with id '${recordId}' from the database`);

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM service_history WHERE id = ?';
	const [result] = await connection.query<RowDataPacket[]>(query, [recordId]);
	connection.release();

	if (result.length === 0) {
		return null;
	}

	return mapServiceHistoryDbToObject(result)[0];
}

async function postServiceRecord(
	serviceData: Omit<ServiceHistory, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ResultSetHeader> {
	logger.info('Adding new service record to the database');

	const fields: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(serviceData)) {
		if (value !== undefined) {
			fields.push(serviceHistoryDbFields[key as keyof ServiceHistory]);
			values.push(value);
		}
	}

	const connection = await getPool().getConnection();
	const query = `INSERT INTO service_history (${fields.join(', ')})
                   VALUES (${fields.map(() => '?').join(', ')})`;
	const [result] = await connection.query<ResultSetHeader>(query, values);
	connection.release();

	return result;
}

async function updateServiceRecordById(
	recordId: number,
	updateValues: Partial<Omit<ServiceHistory, 'id' | 'vehicleIdFk' | 'createdAt' | 'updatedAt'>>
): Promise<ResultSetHeader> {
	logger.info(`Updating service record with id '${recordId}' in the database`);

	if (Object.keys(updateValues).length === 0) {
		logger.error('Trying to update service record with no update values');
		throw new Error('Empty service record update fields');
	}

	const fields: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(updateValues)) {
		if (value !== undefined) {
			fields.push(`${serviceHistoryDbFields[key as keyof ServiceHistory]} = ?`);
			values.push(value);
		}
	}

	values.push(recordId);

	const connection = await getPool().getConnection();
	const query = `UPDATE service_history SET ${fields.join(', ')} WHERE id = ?`;
	const [result] = await connection.query<ResultSetHeader>(query, values);
	connection.release();

	return result;
}

async function deleteServiceRecordById(recordId: number): Promise<ResultSetHeader> {
	logger.info(`Deleting service record with id '${recordId}' from the database`);

	const connection = await getPool().getConnection();
	const query = 'DELETE FROM service_history WHERE id = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [recordId]);
	connection.release();

	return result;
}

async function getRecentServicesByType(
	vehicleId: number,
	serviceType: string,
	limit: number = 5
): Promise<ServiceHistory[]> {
	logger.info(
		`Getting recent '${serviceType}' services for vehicle '${vehicleId}' from the database`
	);

	const connection = await getPool().getConnection();
	const query = `
		SELECT * FROM service_history
		WHERE vehicle_id_fk = ? AND service_type = ?
		ORDER BY service_date DESC
		LIMIT ?
	`;
	const [result] = await connection.query<RowDataPacket[]>(query, [
		vehicleId,
		serviceType,
		limit,
	]);
	connection.release();

	return mapServiceHistoryDbToObject(result);
}

async function getTotalCostByVehicle(vehicleId: number): Promise<number> {
	logger.info(`Getting total service cost for vehicle '${vehicleId}'`);

	const connection = await getPool().getConnection();
	const query = `
		SELECT COALESCE(SUM(cost), 0) as totalCost
		FROM service_history
		WHERE vehicle_id_fk = ?
	`;
	const [result] = await connection.query<RowDataPacket[]>(query, [vehicleId]);
	connection.release();

	return result[0].totalCost;
}

export {
	getAllServiceHistoryByVehicleId,
	getServiceRecordById,
	postServiceRecord,
	updateServiceRecordById,
	deleteServiceRecordById,
	getRecentServicesByType,
	getTotalCostByVehicle,
};
