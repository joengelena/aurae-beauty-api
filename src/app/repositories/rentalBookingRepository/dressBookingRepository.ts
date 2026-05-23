import { Pool, PoolClient, QueryResult } from 'pg';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { DressBooking } from '../../resources/types';
import mapDressBookingDbToObject from './mapDressBookingDbToObject';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

const dressBookingDbFields: Record<
	keyof Omit<DressBooking, 'id' | 'createdAt' | 'updatedAt'>,
	string
> = {
	dressIdFk: 'dress_id_fk',
	typeOfService: 'type_of_service',
	serviceDate: 'service_date',
	serviceProviderName: 'service_provider_name',
	cost: 'cost',
	notes: 'notes',
};

async function getAllServicesByVehicleId(
	dressId: number,
	connection?: Pool | PoolClient
): Promise<DressBooking[]> {
	logger.info(
		`Getting all bookings for dress '${dressId}' from the database`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`
		SELECT * FROM "dress_bookings"
		WHERE dress_id_fk = ?
		ORDER BY service_date DESC
	`);
	const result = await conn.query(query, [dressId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return mapDressBookingDbToObject(result.rows);
}

async function getServiceById(
	bookingId: number,
	connection?: Pool | PoolClient
): Promise<DressBooking | null> {
	logger.info(`Getting booking with id '${bookingId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders('SELECT * FROM "dress_bookings" WHERE id = ?');
	const result = await conn.query(query, [bookingId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		return null;
	}

	return mapDressBookingDbToObject(result.rows)[0];
}

async function postBooking(
	bookingData: Omit<DressBooking, 'id' | 'createdAt' | 'updatedAt'>,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info('Adding new booking to the database');

	const fields: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(bookingData)) {
		if (value !== undefined) {
			fields.push(
				dressBookingDbFields[
					key as keyof Omit<
						DressBooking,
						'id' | 'createdAt' | 'updatedAt'
					>
				]
			);
			values.push(value);
		}
	}

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`INSERT INTO "dress_bookings" (${fields.join(', ')})
                   VALUES (${fields.map(() => '?').join(', ')}) RETURNING id`);
	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function updateServiceById(
	bookingId: number,
	updateValues: Partial<
		Omit<DressBooking, 'id' | 'dressIdFk' | 'createdAt' | 'updatedAt'>
	>,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(
		`Updating booking with id '${bookingId}' in the database`
	);

	if (Object.keys(updateValues).length === 0) {
		logger.error('Trying to update booking with no update values');
		throw new Error('Empty booking update fields');
	}

	const fields = [];
	const values = [];

	for (const [key, value] of Object.entries(updateValues)) {
		fields.push(
			`${
				dressBookingDbFields[
					key as keyof Omit<
						DressBooking,
						'id' | 'createdAt' | 'updatedAt'
					>
				]
			} = ?`
		);
		values.push(value);
	}

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`UPDATE "dress_bookings" SET ${fields.join(', ')} WHERE id = ?`);

	values.push(bookingId);

	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function deleteBookingById(
	bookingId: number,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(
		`Deleting booking with id '${bookingId}' from the database`
	);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders('DELETE FROM "dress_bookings" WHERE id = ?');
	const result = await conn.query(query, [bookingId]);

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
