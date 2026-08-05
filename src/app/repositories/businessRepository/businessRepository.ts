import { Pool, PoolClient, QueryResult } from 'pg';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { Business, BusinessInvite, BusinessRole } from '../../resources/types';
import mapBusinessDbToObject from './mapBusinessDbToObject';
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

type Membership = { businessId: number; role: BusinessRole };

type BusinessMemberRow = {
	userId: string;
	role: BusinessRole;
	firstName: string;
	lastName: string;
	email: string;
	createdAt: Date;
};

function mapInviteRow(row: any): BusinessInvite {
	return {
		id: row.id,
		businessIdFk: row.business_id_fk,
		role: row.role,
		status: row.status,
		expiresAt: row.expires_at,
		createdAt: row.created_at,
	};
}

async function createBusiness(
	name: string,
	ownerUserId: string,
	connection?: Pool | PoolClient
): Promise<Business> {
	logger.info(`Creating business '${name}' for user '${ownerUserId}'`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'INSERT INTO business (name, owner_user_id_fk) VALUES (?, ?) RETURNING *'
	);
	const result = await conn.query(query, [name, ownerUserId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return mapBusinessDbToObject(result.rows)[0];
}

async function getBusinessById(
	id: number,
	connection?: Pool | PoolClient
): Promise<Business | null> {
	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders('SELECT * FROM business WHERE id = ?');
	const result = await conn.query(query, [id]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		return null;
	}

	return mapBusinessDbToObject(result.rows)[0];
}

async function getBusinessByOwnerUserId(
	ownerUserId: string,
	connection?: Pool | PoolClient
): Promise<Business | null> {
	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'SELECT * FROM business WHERE owner_user_id_fk = ?'
	);
	const result = await conn.query(query, [ownerUserId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		return null;
	}

	return mapBusinessDbToObject(result.rows)[0];
}

async function getMembershipForUser(
	userId: string,
	connection?: Pool | PoolClient
): Promise<Membership | null> {
	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'SELECT business_id_fk, role FROM business_member WHERE user_id_fk = ?'
	);
	const result = await conn.query(query, [userId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		return null;
	}

	return { businessId: result.rows[0].business_id_fk, role: result.rows[0].role };
}

async function getBusinessMembers(
	businessId: number,
	connection?: Pool | PoolClient
): Promise<BusinessMemberRow[]> {
	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`
		SELECT bm.user_id_fk, bm.role, bm.created_at, u.first_name, u.last_name, u.email
		FROM business_member bm
		JOIN "user" u ON u.id = bm.user_id_fk
		WHERE bm.business_id_fk = ?
		ORDER BY bm.created_at ASC
	`);
	const result = await conn.query(query, [businessId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result.rows.map((row) => ({
		userId: row.user_id_fk,
		role: row.role,
		firstName: row.first_name,
		lastName: row.last_name,
		email: row.email,
		createdAt: row.created_at,
	}));
}

async function addMember(
	businessId: number,
	userId: string,
	role: BusinessRole,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(`Adding user '${userId}' to business '${businessId}' as '${role}'`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'INSERT INTO business_member (business_id_fk, user_id_fk, role) VALUES (?, ?, ?) RETURNING *'
	);
	const result = await conn.query(query, [businessId, userId, role]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function removeMember(
	businessId: number,
	userId: string,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	logger.info(`Removing user '${userId}' from business '${businessId}'`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'DELETE FROM business_member WHERE business_id_fk = ? AND user_id_fk = ?'
	);
	const result = await conn.query(query, [businessId, userId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function getBusinessSettings(
	businessId: number,
	connection?: Pool | PoolClient
): Promise<Record<string, unknown>> {
	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'SELECT business_settings FROM business WHERE id = ?'
	);
	const result = await conn.query(query, [businessId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		throw new Error('Business not found');
	}

	return result.rows[0].business_settings ?? {};
}

async function updateBusinessSettings(
	businessId: number,
	patch: Record<string, unknown>,
	connection?: Pool | PoolClient
): Promise<Record<string, unknown>> {
	const useProvidedConnection = !!connection;
	const conn = connection || getPool();

	// Merge patch into existing JSONB rather than replacing it
	const query = convertQueryPlaceholders(
		'UPDATE business SET business_settings = business_settings || ?::jsonb WHERE id = ? RETURNING business_settings'
	);
	const result = await conn.query(query, [JSON.stringify(patch), businessId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result.rows[0].business_settings ?? {};
}

async function createInvite(
	businessId: number,
	role: BusinessRole,
	createdByUserId: string,
	codeHash: string,
	expiresAt: Date,
	connection?: Pool | PoolClient
): Promise<BusinessInvite> {
	logger.info(`Creating '${role}' invite for business '${businessId}'`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`
		INSERT INTO business_invite (business_id_fk, role, code_hash, created_by_user_id_fk, expires_at)
		VALUES (?, ?, ?, ?, ?) RETURNING *
	`);
	const result = await conn.query(query, [businessId, role, codeHash, createdByUserId, expiresAt]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return mapInviteRow(result.rows[0]);
}

async function getInviteByCodeHash(
	codeHash: string,
	connection?: Pool | PoolClient
): Promise<BusinessInvite | null> {
	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders('SELECT * FROM business_invite WHERE code_hash = ?');
	const result = await conn.query(query, [codeHash]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	if (result.rows.length === 0) {
		return null;
	}

	return mapInviteRow(result.rows[0]);
}

async function listInvites(
	businessId: number,
	connection?: Pool | PoolClient
): Promise<BusinessInvite[]> {
	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	// Explicit column list — never select code_hash out to a controller response
	const query = convertQueryPlaceholders(`
		SELECT id, business_id_fk, role, status, expires_at, created_at
		FROM business_invite
		WHERE business_id_fk = ?
		ORDER BY created_at DESC
	`);
	const result = await conn.query(query, [businessId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result.rows.map(mapInviteRow);
}

async function markInviteRedeemed(
	inviteId: number,
	redeemedByUserId: string,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`
		UPDATE business_invite
		SET status = 'redeemed', redeemed_by_user_id_fk = ?, redeemed_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	const result = await conn.query(query, [redeemedByUserId, inviteId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function revokeInvite(
	inviteId: number,
	businessId: number,
	connection?: Pool | PoolClient
): Promise<QueryResult> {
	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(`
		UPDATE business_invite
		SET status = 'revoked'
		WHERE id = ? AND business_id_fk = ? AND status = 'pending'
		RETURNING id
	`);
	const result = await conn.query(query, [inviteId, businessId]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

/**
 * Resolves the dress-owner user id for whichever business the given user belongs to
 * (owner or staff) — the seam that gives staff the same wardrobe access as the owner.
 * Returns null if the user has no business membership at all.
 */
async function resolveOwnerUserIdForMember(
	userId: string,
	connection?: Pool | PoolClient
): Promise<string | null> {
	const membership = await getMembershipForUser(userId, connection);
	if (!membership) {
		return null;
	}

	const business = await getBusinessById(membership.businessId, connection);
	return business ? business.ownerUserIdFk : null;
}

export {
	createBusiness,
	getBusinessById,
	getBusinessByOwnerUserId,
	getMembershipForUser,
	getBusinessMembers,
	addMember,
	removeMember,
	getBusinessSettings,
	updateBusinessSettings,
	createInvite,
	getInviteByCodeHash,
	listInvites,
	markInviteRedeemed,
	revokeInvite,
	resolveOwnerUserIdForMember,
};
