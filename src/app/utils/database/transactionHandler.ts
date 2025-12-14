import { Response } from 'express';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import AppError from '../errors/appError';
import { PoolClient } from 'pg';

/**
 * Executes a database operation within a transaction
 * Automatically handles commit, rollback, and connection release
 *
 * @param operation - Async function that performs database operations
 * @param res - Express response object
 * @param errorContext - Context string for error logging (e.g., "vehicle update", "listing deletion")
 * @returns Promise that resolves when operation completes
 */
export async function withTransaction<T>(
	operation: (connection: PoolClient) => Promise<T>,
	res: Response,
	errorContext: string
): Promise<void> {
	const connection = await getPool().connect();

	try {
		await connection.query('BEGIN');
		await operation(connection);
		await connection.query('COMMIT');
		connection.release();
	} catch (error) {
		await connection.query('ROLLBACK');
		connection.release();

		if (error instanceof AppError) {
			throw error;
		}

		logger.error(`Unexpected error during ${errorContext}: ${error.message}`);
		throw new AppError(500, `Unable to ${errorContext}. Please try again.`);
	}
}
