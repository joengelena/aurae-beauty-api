import AppError from '../errors/appError';

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
