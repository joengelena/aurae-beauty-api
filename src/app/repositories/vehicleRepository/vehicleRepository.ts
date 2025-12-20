import { Pool, PoolClient, QueryResult } from 'pg';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { UserVehicle } from '../../resources/types';
import mapVehicleDbToObject from './mapVehicleDbToObject';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

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
	insuranceExpiryDate: 'insurance_expiry_date',
	insuranceProvider: 'insurance_provider',
	vehiclePhotoUrl: 'vehicle_photo_url',
	notes: 'notes',
	createdAt: 'created_at',
	updatedAt: 'updated_at',
};

async function getAllVehiclesByUserId(
	userId: string,
	connection?: Pool | PoolClient
): Promise<UserVehicle[]> {
	logger.info(`Getting all vehicles for user '${userId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`SELECT * FROM "user_vehicles" WHERE user_id_fk = ? ORDER BY created_at DESC`);
	const result = await conn.query(query, [userId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return mapVehicleDbToObject(result.rows);
}

async function getVehicleById(
	vehicleId: number,
	connection?: Pool | PoolClient
): Promise<UserVehicle | null> {
	logger.info(`Getting vehicle with id '${vehicleId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders('SELECT * FROM "user_vehicles" WHERE id = ?');
	const result = await conn.query(query, [vehicleId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		return null;
	}

	return mapVehicleDbToObject(result.rows)[0];
}

async function getVehicleByIdAndUserId(
	vehicleId: number,
	userId: string,
	connection?: Pool | PoolClient
): Promise<UserVehicle | null> {
	logger.info(
		`Getting vehicle with id '${vehicleId}' for user '${userId}' from the database`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders('SELECT * FROM "user_vehicles" WHERE id = ? AND user_id_fk = ?');
	const result = await conn.query(query, [
		vehicleId,
		userId,
	]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		return null;
	}

	return mapVehicleDbToObject(result.rows)[0];
}

async function postVehicle(
	vehicleData: Omit<UserVehicle, 'id' | 'createdAt' | 'updatedAt'>,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
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
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`INSERT INTO "user_vehicles" (${fields.join(', ')})
                   VALUES (${fields.map(() => '?').join(', ')}) RETURNING id`);
	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function updateVehicleById(
	vehicleId: number,
	updateValues: Partial<
		Omit<UserVehicle, 'id' | 'userIdFk' | 'createdAt' | 'updatedAt'>
	>,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(`Updating vehicle with id '${vehicleId}' in the database`);

	if (Object.keys(updateValues).length === 0) {
		logger.error('Trying to update vehicle with no update values');
		throw new Error('Empty vehicle update fields');
	}

	const fields = [];
	const values = [];

	for (const [key, value] of Object.entries(updateValues)) {
		fields.push(`${vehicleDbFields[key as keyof UserVehicle]} = ?`);
		values.push(value);
	}

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`UPDATE "user_vehicles" SET ${fields.join(', ')} WHERE id = ?`);

	values.push(vehicleId);

	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function deleteVehicleById(
	vehicleId: number,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(`Deleting vehicle with id '${vehicleId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders('DELETE FROM "user_vehicles" WHERE id = ?');
	const result = await conn.query(query, [vehicleId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

export {
	getAllVehiclesByUserId,
	getVehicleById,
	getVehicleByIdAndUserId,
	postVehicle,
	updateVehicleById,
	deleteVehicleById,
};
