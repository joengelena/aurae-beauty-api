/**
 * Best-effort R2 cleanup helpers.
 *
 * Used after the database is already in its final state (post-COMMIT deletes)
 * or while rolling back a failed request (deleting freshly uploaded objects).
 * Failures are logged and swallowed: they must never change the response.
 */

import logger from '../../../config/logger';
import { extractKeyFromUrl, deleteMultipleFilesFromR2 } from './r2Client';

/**
 * Deletes the given R2 keys, logging (not throwing) on failure.
 */
export async function deleteR2KeysBestEffort(
	keys: string[],
	context: string
): Promise<void> {
	const uniqueKeys = Array.from(new Set(keys.filter((key) => !!key)));
	if (uniqueKeys.length === 0) return;

	try {
		await deleteMultipleFilesFromR2(uniqueKeys);
		logger.info(`Deleted ${uniqueKeys.length} R2 object(s): ${context}`);
	} catch (r2Error) {
		const msg = r2Error instanceof Error ? r2Error.message : 'Unknown error';
		logger.error(`Failed to delete R2 object(s) (${context}): ${msg}`);
	}
}

/**
 * Deletes the R2 objects behind the given public URLs, logging (not throwing)
 * on failure. URLs that don't belong to our bucket are ignored.
 */
export async function deleteR2UrlsBestEffort(
	urls: string[],
	context: string
): Promise<void> {
	const keys = urls
		.map((url) => extractKeyFromUrl(url))
		.filter((key): key is string => key !== null);

	await deleteR2KeysBestEffort(keys, context);
}
