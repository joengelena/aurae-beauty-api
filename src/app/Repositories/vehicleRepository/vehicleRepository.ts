import { ResultSetHeader, RowDataPacket } from 'mysql2';
import mysql from 'mysql2/promise';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { UserVehicle } from '../../resources/types';
import mapVehicleDbToObject from './mapVehicleDbToObject';

const vehicleDbFields: Record<keyof UserVehicle, string> = {
	id: 'id',
	userIdFk: 'user_id_fk',
	make: 'make',
	model: 'model',
	year: 'year',
	licensePlate: 'license_plate',
	color: 'color',
	fuelType: 'fuel_type',
	transmission: 'transmission',
	odometerReading: 'odometer_reading',
	odometerUnit: 'odometer_unit',
	regoExpiryDate: 'rego_expiry_date',
	wofExpiryDate: 'wof_expiry_date',
	vehiclePhotoUrl: 'vehicle_photo_url',
	notes: 'notes',
	createdAt: 'created_at',
	updatedAt: 'updated_at',
};

async function getAllVehiclesByUserId(
	userId: string,
	connection?: mysql.Pool | mysql.PoolConnection
): Promise<UserVehicle[]> {
	logger.info(`Getting all vehicles for user '${userId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || (await getPool().getConnection());
	const query = `SELECT * FROM user_vehicles WHERE user_id_fk = ? ORDER BY created_at DESC`;
	const [result] = await conn.query<RowDataPacket[]>(query, [userId]);

	if (!useProvidedConnection) {
		(conn as mysql.PoolConnection).release();
	}

	return mapVehicleDbToObject(result);
}

async function getVehicleById(
	vehicleId: number,
	connection?: mysql.Pool | mysql.PoolConnection
): Promise<UserVehicle | null> {
	logger.info(`Getting vehicle with id '${vehicleId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || (await getPool().getConnection());
	const query = 'SELECT * FROM user_vehicles WHERE id = ?';
	const [result] = await conn.query<RowDataPacket[]>(query, [vehicleId]);

	if (!useProvidedConnection) {
		(conn as mysql.PoolConnection).release();
	}

	if (result.length === 0) {
		return null;
	}

	return mapVehicleDbToObject(result)[0];
}

async function getVehicleByIdAndUserId(
	vehicleId: number,
	userId: string
): Promise<UserVehicle | null> {
	logger.info(
		`Getting vehicle with id '${vehicleId}' for user '${userId}' from the database`
	);

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM user_vehicles WHERE id = ? AND user_id_fk = ?';
	const [result] = await connection.query<RowDataPacket[]>(query, [vehicleId, userId]);
	connection.release();

	if (result.length === 0) {
		return null;
	}

	return mapVehicleDbToObject(result)[0];
}

async function postVehicle(
	vehicleData: Omit<UserVehicle, 'id' | 'createdAt' | 'updatedAt'>,
	connection?: mysql.Pool | mysql.PoolConnection
): Promise<ResultSetHeader> {
	logger.info('Adding new vehicle to the database');

	const fields: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(vehicleData)) {
		if (value !== undefined) {
			fields.push(vehicleDbFields[key as keyof UserVehicle]);
			values.push(value);
		}
	}

	const useProvidedConnection = !!connection;
	const conn = connection || (await getPool().getConnection());
	const query = `INSERT INTO user_vehicles (${fields.join(', ')})
                   VALUES (${fields.map(() => '?').join(', ')})`;
	const [result] = await conn.query<ResultSetHeader>(query, values);

	if (!useProvidedConnection) {
		(conn as mysql.PoolConnection).release();
	}

	return result;
}

async function updateVehicleById(
	vehicleId: number,
	updateValues: Partial<Omit<UserVehicle, 'id' | 'userIdFk' | 'createdAt' | 'updatedAt'>>
): Promise<ResultSetHeader> {
	logger.info(`Updating vehicle with id '${vehicleId}' in the database`);

	if (Object.keys(updateValues).length === 0) {
		logger.error('Trying to update vehicle with no update values');
		throw new Error('Empty vehicle update fields');
	}

	const fields: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(updateValues)) {
		if (value !== undefined) {
			fields.push(`${vehicleDbFields[key as keyof UserVehicle]} = ?`);
			values.push(value);
		}
	}

	values.push(vehicleId);

	const connection = await getPool().getConnection();
	const query = `UPDATE user_vehicles SET ${fields.join(', ')} WHERE id = ?`;
	const [result] = await connection.query<ResultSetHeader>(query, values);
	connection.release();

	return result;
}

async function deleteVehicleById(vehicleId: number): Promise<ResultSetHeader> {
	logger.info(`Deleting vehicle with id '${vehicleId}' from the database`);

	const connection = await getPool().getConnection();
	const query = 'DELETE FROM user_vehicles WHERE id = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [vehicleId]);
	connection.release();

	return result;
}

async function getVehiclesWithUpcomingRegoExpiry(
	userId: string,
	daysAhead: number
): Promise<UserVehicle[]> {
	logger.info(
		`Getting vehicles with rego expiring in next ${daysAhead} days for user '${userId}'`
	);

	const connection = await getPool().getConnection();
	const query = `
		SELECT * FROM user_vehicles
		WHERE user_id_fk = ?
		AND rego_expiry_date IS NOT NULL
		AND rego_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
		ORDER BY rego_expiry_date ASC
	`;
	const [result] = await connection.query<RowDataPacket[]>(query, [userId, daysAhead]);
	connection.release();

	return mapVehicleDbToObject(result);
}

async function getVehiclesWithUpcomingWofExpiry(
	userId: string,
	daysAhead: number
): Promise<UserVehicle[]> {
	logger.info(
		`Getting vehicles with WOF expiring in next ${daysAhead} days for user '${userId}'`
	);

	const connection = await getPool().getConnection();
	const query = `
		SELECT * FROM user_vehicles
		WHERE user_id_fk = ?
		AND wof_expiry_date IS NOT NULL
		AND wof_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
		ORDER BY wof_expiry_date ASC
	`;
	const [result] = await connection.query<RowDataPacket[]>(query, [userId, daysAhead]);
	connection.release();

	return mapVehicleDbToObject(result);
}

export {
	getAllVehiclesByUserId,
	getVehicleById,
	getVehicleByIdAndUserId,
	postVehicle,
	updateVehicleById,
	deleteVehicleById,
	getVehiclesWithUpcomingRegoExpiry,
	getVehiclesWithUpcomingWofExpiry,
};
