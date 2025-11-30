import AppError from '../errors/appError';
import * as vehicleRepository from '../../repositories/vehicleRepository/vehicleRepository';
import mysql from 'mysql2/promise';

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
 * Parses and validates vehicle ID from request params
 * @param idParam - The ID parameter from request params
 * @returns The parsed vehicle ID
 * @throws AppError if the ID is not a valid number
 */
export function parseVehicleId(idParam: string): number {
	const vehicleId = parseInt(idParam);
	if (isNaN(vehicleId)) {
		throw new AppError(400, 'Invalid vehicle ID');
	}
	return vehicleId;
}

/**
 * Verifies that a vehicle exists and belongs to the specified user
 * @param vehicleId - The vehicle ID to verify
 * @param userId - The user ID to verify ownership
 * @param connection - Database connection (optional)
 * @throws AppError if vehicle not found or doesn't belong to user
 */
export async function verifyVehicleOwnership(
	vehicleId: number,
	userId: string,
	connection?: mysql.Pool | mysql.PoolConnection
): Promise<void> {
	const vehicle = await vehicleRepository.getVehicleByIdAndUserId(
		vehicleId,
		userId,
		connection
	);

	if (!vehicle) {
		throw new AppError(404, 'Vehicle not found or does not belong to you');
	}
}
