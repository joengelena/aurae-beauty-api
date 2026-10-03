import { todayInBookingTimeZone, validateBookingDates } from '../../src/app/controllers/rentalBookingController/bookingDates';
import AppError from '../../src/app/utils/errors/appError';

function errorOf(fn: () => void): AppError | null {
	try {
		fn();
		return null;
	} catch (e) {
		return e as AppError;
	}
}

describe('validateBookingDates', () => {
	afterEach(() => jest.useRealTimers());

	it('accepts a forward range and a single-day range', () => {
		expect(() => validateBookingDates('2030-05-01', '2030-05-03')).not.toThrow();
		expect(() => validateBookingDates('2030-05-01', '2030-05-01')).not.toThrow();
	});

	it('rejects a reversed range with a 400 AppError', () => {
		const err = errorOf(() => validateBookingDates('2030-05-03', '2030-05-01'));
		expect(err).toBeInstanceOf(AppError);
		expect(err?.status).toBe(400);
	});

	it('compares calendar dates, not string lengths or instants (month/year boundaries)', () => {
		expect(() => validateBookingDates('2030-12-31', '2031-01-01')).not.toThrow();
		expect(errorOf(() => validateBookingDates('2031-01-01', '2030-12-31'))?.status).toBe(400);
	});

	it('owner paths (no rejectPastStart) may record a booking that already started', () => {
		jest.useFakeTimers({ now: new Date('2030-06-15T00:00:00Z') });
		expect(() => validateBookingDates('2030-06-01', '2030-06-20')).not.toThrow();
	});

	describe('rejectPastStart uses the New Zealand calendar day', () => {
		it('in NZ summer (NZDT, UTC+13): just after 11:00 UTC it is already tomorrow in Auckland', () => {
			// 2030-01-15 12:30 UTC == 2030-01-16 01:30 in Auckland.
			jest.useFakeTimers({ now: new Date('2030-01-15T12:30:00Z') });
			expect(todayInBookingTimeZone()).toBe('2030-01-16');

			// The UTC date is now in the past for an NZ renter.
			expect(errorOf(() => validateBookingDates('2030-01-15', '2030-01-17', { rejectPastStart: true }))?.status).toBe(400);
			// Starting "today" in Auckland is fine, even though UTC is still on the 15th.
			expect(() => validateBookingDates('2030-01-16', '2030-01-17', { rejectPastStart: true })).not.toThrow();
		});

		it('in NZ winter (NZST, UTC+12): late on the NZ day is still that day', () => {
			// 2030-07-01 11:59 UTC == 2030-07-01 23:59 in Auckland.
			jest.useFakeTimers({ now: new Date('2030-07-01T11:59:00Z') });
			expect(todayInBookingTimeZone()).toBe('2030-07-01');
			expect(() => validateBookingDates('2030-07-01', '2030-07-01', { rejectPastStart: true })).not.toThrow();
			expect(errorOf(() => validateBookingDates('2030-06-30', '2030-07-02', { rejectPastStart: true }))?.status).toBe(400);
		});

		it('a booking starting this afternoon is not refused for time-of-day reasons', () => {
			// 23:00 in Auckland on 2030-03-10 (NZDT).
			jest.useFakeTimers({ now: new Date('2030-03-10T10:00:00Z') });
			expect(() => validateBookingDates('2030-03-10', '2030-03-11', { rejectPastStart: true })).not.toThrow();
		});
	});
});
