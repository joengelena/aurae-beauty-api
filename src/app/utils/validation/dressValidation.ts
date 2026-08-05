import AppError from '../errors/appError';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';
import * as businessRepository from '../../repositories/businessRepository/businessRepository';
import { Pool, PoolClient } from 'pg';

/**
 * Validates that a date is not more than 1 year in the past
 * @param date - The date string to validate
 * @param fieldName - The name of the field for error messages (e.g., "Registration expiry date", "WOF expiry date")
 * @throws AppError if the date is more than 1 year in the past
 */
export function validateExpiryDate(date: string, fieldName: string): void {
	const oneYearAgo = new Date();
	oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

	const expiryDate = new Date(date);
	if (expiryDate < oneYearAgo) {
		throw new AppError(
			400,
			`${fieldName} cannot be more than 1 year in the past`
		);
	}
}

/**
 * Parses and validates dress ID from request params
 * @param idParam - The ID parameter from request params
 * @returns The parsed dress ID
 * @throws AppError if the ID is not a valid number
 */
export function parseDressId(idParam: string): number {
	const dressId = parseInt(idParam, 10);
	if (isNaN(dressId)) {
		throw new AppError(400, 'Invalid dress ID');
	}
	return dressId;
}

/**
 * Verifies that a dress exists and belongs to the specified user
 * @param dressId - The dress ID to verify
 * @param userId - The user ID to verify ownership
 * @param connection - Database connection (optional)
 * @throws AppError if dress not found or doesn't belong to user
 */
export async function verifyDressOwnership(
	dressId: number,
	userId: string,
	connection?: Pool | PoolClient
): Promise<void> {
	// A staff member has no dresses of their own — resolve to the business's
	// owner account (the id dresses are actually keyed under) before checking.
	const ownerUserId = await businessRepository.resolveOwnerUserIdForMember(
		userId,
		connection
	);

	if (!ownerUserId) {
		throw new AppError(403, "You don't belong to a business");
	}

	const dress = await dressRepository.getDressByIdAndUserId(
		dressId,
		ownerUserId,
		connection
	);

	if (!dress) {
		throw new AppError(404, 'Dress not found or does not belong to you');
	}
}
