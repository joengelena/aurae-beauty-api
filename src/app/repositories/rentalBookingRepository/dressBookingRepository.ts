import { Pool, PoolClient, QueryResult } from 'pg';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { VehicleService } from '../../resources/types';
import mapDressBookingDbToObject from './mapDressBookingDbToObject';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

const vehicleServiceDbFields: Record<
	keyof Omit<VehicleService, 'id' | 'createdAt' | 'updatedAt'>,
	string
> = {
	dressIdFk: 'vehicle_id_fk',
	typeOfService: 'type_of_service',
	serviceDate: 'service_date',
	serviceProviderName: 'service_provider_name',
	cost: 'cost',
	notes: 'notes',
};

async function getAllServicesByVehicleId(
	vehicleId: number,
	connection?: Pool | PoolClient
): Promise<VehicleService[]> {
	logger.info(
		`Getting all services for dress '${vehicleId}' from the database`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`
		SELECT * FROM "vehicle_service"
		WHERE vehicle_id_fk = ?
		ORDER BY service_date DESC
	`);
	const result = await conn.query(query, [vehicleId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return mapDressBookingDbToObject(result.rows);
}

async function getServiceById(
	serviceId: number,
	connection?: Pool | PoolClient
): Promise<VehicleService | null> {
	logger.info(`Getting booking with id '${serviceId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders('SELECT * FROM "vehicle_service" WHERE id = ?');
	const result = await conn.query(query, [serviceId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		return null;
	}

	return mapDressBookingDbToObject(result.rows)[0];
}

async function postBooking(
	serviceData: Omit<VehicleService, 'id' | 'createdAt' | 'updatedAt'>,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info('Adding new dress service to the database');

	const fields: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(serviceData)) {
		if (value !== undefined) {
			fields.push(
				vehicleServiceDbFields[
					key as keyof Omit<
						VehicleService,
						'id' | 'createdAt' | 'updatedAt'
					>
				]
			);
			values.push(value);
		}
	}

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`INSERT INTO "vehicle_service" (${fields.join(', ')})
                   VALUES (${fields.map(() => '?').join(', ')})`);
	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function updateServiceById(
	serviceId: number,
	updateValues: Partial<
		Omit<VehicleService, 'id' | 'dressIdFk' | 'createdAt' | 'updatedAt'>
	>,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(
		`Updating dress booking with id '${serviceId}' in the database`
	);

	if (Object.keys(updateValues).length === 0) {
		logger.error('Trying to update vehicle service with no update values');
		throw new Error('Empty vehicle service update fields');
	}

	const fields = [];
	const values = [];

	for (const [key, value] of Object.entries(updateValues)) {
		fields.push(
			`${
				vehicleServiceDbFields[
					key as keyof Omit<
						VehicleService,
						'id' | 'createdAt' | 'updatedAt'
					>
				]
			} = ?`
		);
		values.push(value);
	}

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`UPDATE "vehicle_service" SET ${fields.join(', ')} WHERE id = ?`);

	values.push(serviceId);

	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function deleteBookingById(
	serviceId: number,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(
		`Deleting dress booking with id '${serviceId}' from the database`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders('DELETE FROM "vehicle_service" WHERE id = ?');
	const result = await conn.query(query, [serviceId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

export {
	getAllServicesByVehicleId,
	getServiceById,
	postBooking,
	updateServiceById,
	deleteBookingById,
};
