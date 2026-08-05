import { Pool, PoolClient, QueryResult } from 'pg';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { DressDamageIncident } from '../../resources/types';
import mapDressDamageIncidentDbToObject from './mapDressDamageIncidentDbToObject';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

const incidentDbFields: Record<
	keyof Omit<DressDamageIncident, 'id' | 'createdAt' | 'updatedAt'>,
	string
> = {
	dressIdFk: 'dress_id_fk',
	bookingIdFk: 'booking_id_fk',
	description: 'description',
	photoUrls: 'photo_urls',
	occurredAt: 'occurred_at',
	isPublic: 'is_public',
	resolved: 'resolved',
	resolutionNotes: 'resolution_notes',
	resolvedAt: 'resolved_at',
};

async function getIncidentsByDressId(
	dressId: number,
	connection?: Pool | PoolClient
): Promise<DressDamageIncident[]> {
	logger.info(`Getting all damage incidents for dress '${dressId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`
		SELECT * FROM "dress_damage_incidents"
		WHERE dress_id_fk = ?
		ORDER BY occurred_at DESC, created_at DESC
	`);
	const result = await conn.query(query, [dressId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return mapDressDamageIncidentDbToObject(result.rows);
}

async function getPublicIncidentsByDressId(
	dressId: number,
	connection?: Pool | PoolClient
): Promise<DressDamageIncident[]> {
	logger.info(`Getting public damage incidents for dress '${dressId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`
		SELECT * FROM "dress_damage_incidents"
		WHERE dress_id_fk = ? AND is_public = TRUE
		ORDER BY occurred_at DESC, created_at DESC
	`);
	const result = await conn.query(query, [dressId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return mapDressDamageIncidentDbToObject(result.rows);
}

async function getIncidentById(
	incidentId: number,
	connection?: Pool | PoolClient
): Promise<DressDamageIncident | null> {
	logger.info(`Getting damage incident with id '${incidentId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'SELECT * FROM "dress_damage_incidents" WHERE id = ?'
	);
	const result = await conn.query(query, [incidentId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		return null;
	}

	return mapDressDamageIncidentDbToObject(result.rows)[0];
}

async function postIncident(
	incidentData: Omit<DressDamageIncident, 'id' | 'createdAt' | 'updatedAt'>,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(`Adding new damage incident for dress '${incidentData.dressIdFk}'`);

	const fields: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(incidentData)) {
		if (value !== undefined) {
			fields.push(
				incidentDbFields[key as keyof Omit<DressDamageIncident, 'id' | 'createdAt' | 'updatedAt'>]
			);
			values.push(value);
		}
	}

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`INSERT INTO "dress_damage_incidents" (${fields.join(', ')})
                   VALUES (${fields.map(() => '?').join(', ')}) RETURNING id`);
	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function updateIncidentById(
	incidentId: number,
	updateValues: Partial<Omit<DressDamageIncident, 'id' | 'dressIdFk' | 'createdAt' | 'updatedAt'>>,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(`Updating damage incident with id '${incidentId}' in the database`);

	if (Object.keys(updateValues).length === 0) {
		logger.error('Trying to update damage incident with no update values');
		throw new Error('Empty damage incident update fields');
	}

	const fields: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(updateValues)) {
		fields.push(
			`${incidentDbFields[key as keyof Omit<DressDamageIncident, 'id' | 'createdAt' | 'updatedAt'>]} = ?`
		);
		values.push(value);
	}

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		`UPDATE "dress_damage_incidents" SET ${fields.join(', ')} WHERE id = ?`
	);

	values.push(incidentId);

	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function deleteIncidentById(
	incidentId: number,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(`Deleting damage incident with id '${incidentId}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'DELETE FROM "dress_damage_incidents" WHERE id = ?'
	);
	const result = await conn.query(query, [incidentId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

export {
	getIncidentsByDressId,
	getPublicIncidentsByDressId,
	getIncidentById,
	postIncident,
	updateIncidentById,
	deleteIncidentById,
};
