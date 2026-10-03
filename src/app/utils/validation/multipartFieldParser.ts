import AppError from '../errors/appError';

/**
 * Helpers for JSON-encoded multipart form fields.
 *
 * Multipart requests can only carry strings, so arrays arrive JSON-encoded
 * and AJV only sees `type: string`. These helpers parse and shape-check them,
 * turning malformed input into a 400 instead of an unhandled JSON.parse 500.
 * Call them before uploading anything to R2.
 */

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseJsonField(value: unknown, fieldName: string): unknown {
	if (typeof value !== 'string') {
		throw new AppError(400, `Invalid ${fieldName}`);
	}

	try {
		return JSON.parse(value);
	} catch {
		throw new AppError(400, `Invalid ${fieldName}: must be valid JSON`);
	}
}

function isValidDateOnly(value: unknown): value is string {
	if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
		return false;
	}

	const date = new Date(`${value}T00:00:00Z`);
	return !isNaN(date.getTime()) && date.toISOString().substring(0, 10) === value;
}

/**
 * Parses a JSON-encoded array of strings.
 * @throws AppError(400) if the field is not valid JSON or not an array of strings
 */
export function parseStringArrayField(
	value: unknown,
	fieldName: string,
	maxItems: number = 100,
	maxItemLength: number = 2048
): string[] {
	const parsed = parseJsonField(value, fieldName);

	if (
		!Array.isArray(parsed) ||
		parsed.length > maxItems ||
		!parsed.every(
			(item) => typeof item === 'string' && item.length <= maxItemLength
		)
	) {
		throw new AppError(400, `Invalid ${fieldName}: must be an array of strings`);
	}

	return parsed as string[];
}

/**
 * Parses a JSON-encoded array of { startDate, endDate } date ranges (YYYY-MM-DD).
 * Extra keys are dropped; startDate must not be after endDate.
 * @throws AppError(400) if the field is malformed
 */
export function parseDateRangeArrayField(
	value: unknown,
	fieldName: string,
	maxItems: number = 500
): { startDate: string; endDate: string }[] {
	const parsed = parseJsonField(value, fieldName);
	const invalid = () =>
		new AppError(
			400,
			`Invalid ${fieldName}: must be an array of { startDate, endDate } dates (YYYY-MM-DD)`
		);

	if (!Array.isArray(parsed) || parsed.length > maxItems) {
		throw invalid();
	}

	return parsed.map((range) => {
		if (!range || typeof range !== 'object' || Array.isArray(range)) {
			throw invalid();
		}

		const { startDate, endDate } = range as Record<string, unknown>;

		if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate) || startDate > endDate) {
			throw invalid();
		}

		return { startDate, endDate };
	});
}
