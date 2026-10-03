import AppError from '../../src/app/utils/errors/appError';
import { parsePositiveIntId } from '../../src/app/utils/validation/idValidation';
import { parseDressId } from '../../src/app/utils/validation/dressValidation';
import {
	parseDateRangeArrayField,
	parseStringArrayField,
} from '../../src/app/utils/validation/multipartFieldParser';
import { convertQueryPlaceholders } from '../../src/app/utils/database/queryHelper';
import { hashInviteCode, generateInviteCode } from '../../src/app/utils/invite/generateInviteCode';
import { validateFiles, FILE_VALIDATION_CONFIG } from '../../src/app/utils/cloudflare/validation';

function statusOf(fn: () => unknown): number | null {
	try {
		fn();
		return null;
	} catch (e) {
		expect(e).toBeInstanceOf(AppError);
		return (e as AppError).status;
	}
}

describe('AppError', () => {
	it('is an Error carrying an HTTP status and a client-safe message', () => {
		const err = new AppError(404, 'Dress not found');
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(AppError);
		expect(err.status).toBe(404);
		expect(err.message).toBe('Dress not found');
	});

	it('defaults to 400 when no status is given', () => {
		expect(new AppError(undefined, 'Bad input').status).toBe(400);
	});
});

describe('parsePositiveIntId', () => {
	it('parses positive integer ids within the Postgres INTEGER range', () => {
		expect(parsePositiveIntId('1', 'dress ID')).toBe(1);
		expect(parsePositiveIntId('42', 'dress ID')).toBe(42);
		expect(parsePositiveIntId(' 7 ', 'dress ID')).toBe(7);
		expect(parsePositiveIntId('2147483647', 'dress ID')).toBe(2147483647);
	});

	it('rejects anything else with a 400 (never lets it reach SQL)', () => {
		for (const input of ['0', '-1', '12abc', '1e3', '1.5', '', '  ', 'abc', '2147483648', '99999999999', '0x10']) {
			expect({ input, status: statusOf(() => parsePositiveIntId(input, 'dress ID')) }).toEqual({ input, status: 400 });
		}
		expect(statusOf(() => parsePositiveIntId(undefined as unknown as string, 'booking ID'))).toBe(400);
	});

	it('names the id in the message', () => {
		expect(() => parseDressId('nope')).toThrow('Invalid dress ID');
	});
});

describe('multipart field parsers', () => {
	describe('parseStringArrayField', () => {
		it('parses a JSON array of strings', () => {
			expect(parseStringArrayField('["a","b"]', 'keepPhotoUrls')).toEqual(['a', 'b']);
			expect(parseStringArrayField('[]', 'keepPhotoUrls')).toEqual([]);
		});

		it('rejects malformed values with a 400', () => {
			for (const input of ['not json', '{"a":1}', '"just a string"', '[1,2]', '["ok", null]']) {
				expect({ input, status: statusOf(() => parseStringArrayField(input, 'keepPhotoUrls')) }).toEqual({ input, status: 400 });
			}
		});

		it('rejects a non-string field value (e.g. a repeated form field arriving as an array)', () => {
			expect(statusOf(() => parseStringArrayField(['["a"]'], 'keepPhotoUrls'))).toBe(400);
			expect(statusOf(() => parseStringArrayField(undefined, 'keepPhotoUrls'))).toBe(400);
		});

		it('enforces item count and item length limits', () => {
			expect(statusOf(() => parseStringArrayField(JSON.stringify(['a', 'b', 'c']), 'x', 2))).toBe(400);
			expect(statusOf(() => parseStringArrayField(JSON.stringify(['abcdef']), 'x', 10, 5))).toBe(400);
		});
	});

	describe('parseDateRangeArrayField', () => {
		it('parses valid ranges and drops extra keys', () => {
			const parsed = parseDateRangeArrayField(
				JSON.stringify([{ startDate: '2030-01-01', endDate: '2030-01-03', note: 'x' }]),
				'blockedDateRanges'
			);
			expect(parsed).toEqual([{ startDate: '2030-01-01', endDate: '2030-01-03' }]);
		});

		it('accepts a single-day range', () => {
			expect(
				parseDateRangeArrayField(JSON.stringify([{ startDate: '2030-01-01', endDate: '2030-01-01' }]), 'r')
			).toHaveLength(1);
		});

		it('rejects reversed, impossible, mis-formatted or mis-shaped ranges with a 400', () => {
			const invalid: unknown[] = [
				[{ startDate: '2030-01-05', endDate: '2030-01-01' }],
				[{ startDate: '2030-02-30', endDate: '2030-03-01' }],
				[{ startDate: '01/02/2030', endDate: '2030-03-01' }],
				[{ startDate: '2030-01-01' }],
				['2030-01-01'],
				{ startDate: '2030-01-01', endDate: '2030-01-02' },
			];
			for (const value of invalid) {
				expect({ value, status: statusOf(() => parseDateRangeArrayField(JSON.stringify(value), 'r')) }).toEqual({ value, status: 400 });
			}
			expect(statusOf(() => parseDateRangeArrayField('nope', 'r'))).toBe(400);
		});
	});
});

describe('convertQueryPlaceholders', () => {
	it('numbers each ? in order', () => {
		expect(convertQueryPlaceholders('SELECT * FROM t WHERE a = ? AND b = ? LIMIT ?')).toBe(
			'SELECT * FROM t WHERE a = $1 AND b = $2 LIMIT $3'
		);
	});

	it('leaves a query without placeholders untouched', () => {
		expect(convertQueryPlaceholders('SELECT 1')).toBe('SELECT 1');
	});

	it('restarts numbering for every query', () => {
		convertQueryPlaceholders('? ?');
		expect(convertQueryPlaceholders('x = ?')).toBe('x = $1');
	});
});

describe('invite codes', () => {
	it('generates an 8-character code without ambiguous characters, plus its sha256 hash', () => {
		for (let i = 0; i < 50; i++) {
			const { code, codeHash } = generateInviteCode();
			expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
			expect(code).not.toMatch(/[01OIL]/);
			expect(codeHash).toMatch(/^[0-9a-f]{64}$/);
			expect(codeHash).toBe(hashInviteCode(code));
		}
	});

	it('hashes case-insensitively so a code typed in lowercase still redeems', () => {
		expect(hashInviteCode('abcd2345')).toBe(hashInviteCode('ABCD2345'));
	});
});

describe('validateFiles (image uploads)', () => {
	const file = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File =>
		({ originalname: 'a.jpg', mimetype: 'image/jpeg', size: 1024, buffer: Buffer.alloc(1), ...overrides } as Express.Multer.File);

	it('accepts JPEG, PNG, WebP and HEIC images', () => {
		expect(() =>
			validateFiles([
				file(),
				file({ mimetype: 'image/png' }),
				file({ mimetype: 'image/webp' }),
				file({ mimetype: 'image/heic' }),
			])
		).not.toThrow();
	});

	it('requires at least one file', () => {
		expect(statusOf(() => validateFiles([]))).toBe(400);
	});

	it('rejects files over 10MB', () => {
		expect(statusOf(() => validateFiles([file({ size: FILE_VALIDATION_CONFIG.MAX_FILE_SIZE + 1 })]))).toBe(400);
	});

	it('rejects non-image types', () => {
		expect(statusOf(() => validateFiles([file({ mimetype: 'application/pdf' })]))).toBe(400);
		expect(statusOf(() => validateFiles([file({ mimetype: 'image/svg+xml' })]))).toBe(400);
	});

	it('rejects more than 10 files', () => {
		expect(statusOf(() => validateFiles(Array.from({ length: 11 }, () => file())))).toBe(400);
	});
});
