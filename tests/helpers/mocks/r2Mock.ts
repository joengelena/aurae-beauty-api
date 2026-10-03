/**
 * Stand-in for src/app/utils/cloudflare/r2Client.ts. The pure helpers (key
 * generation, URL <-> key) are the real ones; every call that would reach R2
 * is recorded here instead.
 */
export const r2Calls = {
	uploads: [] as { key: string; contentType: string; size: number }[],
	deletes: [] as string[],
};

export function resetR2Calls(): void {
	r2Calls.uploads.length = 0;
	r2Calls.deletes.length = 0;
}

export function createR2ClientMock() {
	const actual = jest.requireActual('../../../src/app/utils/cloudflare/r2Client');

	return {
		...actual,
		uploadFileToR2: jest.fn(async (buffer: Buffer, key: string, contentType: string) => {
			r2Calls.uploads.push({ key, contentType, size: buffer.length });
		}),
		deleteFileFromR2: jest.fn(async (key: string) => {
			r2Calls.deletes.push(key);
		}),
		deleteMultipleFilesFromR2: jest.fn(async (keys: string[]) => {
			r2Calls.deletes.push(...keys);
		}),
	};
}
