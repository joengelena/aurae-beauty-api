import AppError from '../errors/appError';

// Upper bound of a PostgreSQL INTEGER / SERIAL column. Anything larger makes
// Postgres throw "out of range for type integer", which would surface as a 500.
const POSTGRES_INT_MAX = 2147483647;

/**
 * Parses a positive integer id from a route param.
 * Rejects anything that is not purely digits (e.g. "12abc", "-1", "1e3")
 * and anything outside the Postgres INTEGER range.
 * @throws AppError(400) with `Invalid ${label}` if the value is not a valid id
 */
export function parsePositiveIntId(idParam: string, label: string): number {
	const raw = typeof idParam === 'string' ? idParam.trim() : '';

	if (!/^\d{1,10}$/.test(raw)) {
		throw new AppError(400, `Invalid ${label}`);
	}

	const id = Number(raw);
	if (!Number.isSafeInteger(id) || id < 1 || id > POSTGRES_INT_MAX) {
		throw new AppError(400, `Invalid ${label}`);
	}

	return id;
}
