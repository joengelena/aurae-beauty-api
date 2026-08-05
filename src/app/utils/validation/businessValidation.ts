import AppError from '../errors/appError';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import { BusinessRole } from '../../resources/types';
import { Pool, PoolClient } from 'pg';

/**
 * Parses and validates a business ID from request params
 * @param idParam - The ID parameter from request params
 * @returns The parsed business ID
 * @throws AppError if the ID is not a valid number
 */
export function parseBusinessId(idParam: string): number {
	const businessId = parseInt(idParam, 10);
	if (isNaN(businessId)) {
		throw new AppError(400, 'Invalid business ID');
	}
	return businessId;
}

/**
 * Verifies that a user belongs to the given business with one of the allowed roles
 * @param businessId - The business ID to check membership against
 * @param userId - The user ID to check
 * @param allowedRoles - Roles that are permitted
 * @param connection - Database connection (optional)
 * @returns The user's role in the business
 * @throws AppError if the user has no membership, or a mismatched membership, for this business
 */
export async function verifyBusinessRole(
	businessId: number,
	userId: string,
	allowedRoles: BusinessRole[],
	connection?: Pool | PoolClient
): Promise<BusinessRole> {
	const membership = await businessRepository.getMembershipForUser(userId, connection);

	if (!membership || membership.businessId !== businessId || !allowedRoles.includes(membership.role)) {
		throw new AppError(403, 'You do not have access to this business');
	}

	return membership.role;
}
