import AppError from '../../utils/errors/appError';

// Business date for the marketplace. Every booking date is a calendar day in
// New Zealand, so "today" has to be the NZ calendar day too: comparing against
// the server's UTC clock would call tomorrow morning in Auckland "today", and
// rejecting on time-of-day would refuse a booking that starts this afternoon.
const BOOKING_TIME_ZONE = 'Pacific/Auckland';

// en-CA formats as YYYY-MM-DD, which compares correctly as a plain string
// against the AJV-validated `format: date` inputs.
const todayFormatter = new Intl.DateTimeFormat('en-CA', {
	timeZone: BOOKING_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

function todayInBookingTimeZone(): string {
	return todayFormatter.format(new Date());
}

type BookingDateOptions = {
	// Renter-facing paths (self-book, cart) must not start in the past. Owner
	// paths may legitimately record a booking that has already begun.
	rejectPastStart?: boolean;
};

/**
 * The one check every booking write path runs on its dates before they reach
 * daterange(), which raises a 22000 error (a 500) on a reversed range.
 * Dates are compared as YYYY-MM-DD strings, never as instants.
 * @throws AppError(400) if the range is reversed or, when asked, starts in the past
 */
function validateBookingDates(
	startDate: string,
	endDate: string,
	options: BookingDateOptions = {}
): void {
	if (startDate > endDate) {
		throw new AppError(400, 'The start date must be on or before the end date');
	}

	if (options.rejectPastStart && startDate < todayInBookingTimeZone()) {
		throw new AppError(400, 'The start date cannot be in the past');
	}
}

export { validateBookingDates, todayInBookingTimeZone };
