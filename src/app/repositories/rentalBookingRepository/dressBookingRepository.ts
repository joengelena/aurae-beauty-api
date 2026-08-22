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
	bookingType: 'booking_type',
	bookingDate: 'booking_date',
	startDate: 'start_date',
	endDate: 'end_date',
	renterName: 'renter_name',
	renterEmail: 'renter_email',
	renterPhone: 'renter_phone',
	renterInstagram: 'renter_instagram',
	totalCost: 'total_cost',
	depositPaid: 'deposit_paid',
	status: 'status',
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
		ORDER BY booking_date DESC
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

async function getAllBookingsByUserId(
	userId: string,
	connection?: Pool | PoolClient
): Promise<DressBooking[]> {
	logger.info(`Getting all bookings for user '${userId}'`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`
		SELECT db.* FROM "dress_bookings" db
		JOIN "user_dresses" ud ON ud.id = db.dress_id_fk
		WHERE ud.user_id_fk = ?
		ORDER BY db.start_date ASC
	`);
	const result = await conn.query(query, [userId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return mapDressBookingDbToObject(result.rows);
}

async function getPublicAvailabilityByDressId(
	dressId: number,
	connection?: Pool | PoolClient
): Promise<{ startDate: string; endDate: string; status: string }[]> {
	logger.info(`Getting public availability ranges for dress '${dressId}'`);

	const conn = connection || getPool();

	const dressQuery = convertQueryPlaceholders(`
		SELECT ud.blocked_date_ranges, b.business_settings->>'cleaningBufferDays' AS cleaning_buffer_days
		FROM "user_dresses" ud
		JOIN business b ON b.owner_user_id_fk = ud.user_id_fk
		WHERE ud.id = ?
	`);
	const dressResult = await conn.query(dressQuery, [dressId]);
	const parsedBufferDays = parseInt(dressResult.rows[0]?.cleaning_buffer_days, 10);
	const bufferDays: number = Number.isNaN(parsedBufferDays) ? 1 : parsedBufferDays;

	const bookingsQuery = convertQueryPlaceholders(`
		SELECT start_date, end_date, status
		FROM "dress_bookings"
		WHERE dress_id_fk = ?
		  -- Only a cancelled booking releases its dates. A returned one keeps
		  -- holding them until its cleaning buffer has run, which is applied below.
		  AND status <> 'cancelled'
		ORDER BY start_date ASC
	`);
	const bookingsResult = await conn.query(bookingsQuery, [dressId]);
	const bookingRanges = bookingsResult.rows.map((row: any) => ({
		startDate: row.start_date,
		endDate: row.end_date,
		status: row.status,
	}));

	// Cleaning buffer after each active/upcoming booking, represented as its
	// own 'blocked' range so existing unavailable-range consumers (calendar
	// widgets, availability filters) need no changes to treat it as unavailable.
	const bufferRanges: { startDate: Date; endDate: Date; status: string }[] = [];
	if (bufferDays > 0) {
		for (const row of bookingsResult.rows) {
			const bufferStart = new Date(row.end_date);
			bufferStart.setDate(bufferStart.getDate() + 1);
			const bufferEnd = new Date(row.end_date);
			bufferEnd.setDate(bufferEnd.getDate() + bufferDays);
			bufferRanges.push({ startDate: bufferStart, endDate: bufferEnd, status: 'blocked' });
		}
	}

	const blockedRanges: { startDate: string; endDate: string; status: string }[] =
		(dressResult.rows[0]?.blocked_date_ranges ?? []).map((r: any) => ({
			startDate: r.startDate,
			endDate: r.endDate,
			status: 'blocked',
		}));

	if (!connection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return [...bookingRanges, ...bufferRanges, ...blockedRanges];
}

async function hasBookingConflict(
	dressId: number,
	startDate: string,
	endDate: string,
	connection?: Pool | PoolClient,
	excludeBookingId?: number
): Promise<boolean> {
	logger.info(`Checking booking conflicts for dress '${dressId}'`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();

	const excludeClause = excludeBookingId !== undefined ? ' AND db.id != ?' : '';
	const bookingQuery = convertQueryPlaceholders(`
		SELECT 1 FROM "dress_bookings" db
		JOIN "user_dresses" ud ON ud.id = db.dress_id_fk
		JOIN business b ON b.owner_user_id_fk = ud.user_id_fk
		WHERE db.dress_id_fk = ?
		  -- Marking a booking returned must not free the dress. The turnaround
		  -- buffer below is exactly the window between the dress coming back and
		  -- it being wearable again, so a returned booking still blocks.
		  AND db.status <> 'cancelled'
		  ${excludeClause}
		  AND db.start_date <= ?
		  AND (db.end_date + (INTERVAL '1 day' * COALESCE((b.business_settings->>'cleaningBufferDays')::int, 1)))::date >= ?
		LIMIT 1
	`);
	const bookingParams = excludeBookingId !== undefined
		? [dressId, excludeBookingId, endDate, startDate]
		: [dressId, endDate, startDate];
	const bookingResult = await conn.query(bookingQuery, bookingParams);

	if (bookingResult.rows.length > 0) {
		if (!useProvidedConnection && 'release' in conn) {
			(conn as PoolClient).release();
		}
		return true;
	}

	const blockedQuery = convertQueryPlaceholders(`
		SELECT 1 FROM "user_dresses" ud,
			jsonb_to_recordset(ud.blocked_date_ranges) AS br("startDate" date, "endDate" date)
		WHERE ud.id = ?
		  AND br."startDate" <= ?
		  AND br."endDate" >= ?
		LIMIT 1
	`);
	const blockedResult = await conn.query(blockedQuery, [dressId, endDate, startDate]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return blockedResult.rows.length > 0;
}

export {
	getAllServicesByVehicleId,
	getServiceById,
	postBooking,
	updateServiceById,
	deleteBookingById,
	getAllBookingsByUserId,
	getPublicAvailabilityByDressId,
	hasBookingConflict,
};
