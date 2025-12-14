/**
 * Converts MySQL-style query placeholders (?) to PostgreSQL-style ($1, $2, $3, etc.)
 * This function is used during the MySQL to PostgreSQL migration
 * @param query - SQL query string with ? placeholders
 * @returns Query string with $1, $2, $3 placeholders
 */
export function convertQueryPlaceholders(query: string): string {
	let index = 1;
	return query.replace(/\?/g, () => `$${index++}`);
}
