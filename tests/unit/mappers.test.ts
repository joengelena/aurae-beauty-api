import mapDressBookingDbToObject from '../../src/app/repositories/rentalBookingRepository/mapDressBookingDbToObject';
import mapDressDbToObject from '../../src/app/repositories/dressRepository/mapDressDbToObject';
import mapDressDamageIncidentDbToObject from '../../src/app/repositories/dressDamageIncidentRepository/mapDressDamageIncidentDbToObject';
import mapBusinessDbToObject from '../../src/app/repositories/businessRepository/mapBusinessDbToObject';

// node-postgres hands DATE columns back as a JS Date at local midnight.
const pgDate = (y: number, m: number, d: number) => new Date(y, m - 1, d);

const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/;

function expectCamelCaseKeys(obj: object) {
	for (const key of Object.keys(obj)) expect(key).toMatch(CAMEL_CASE);
}

describe('mapDressBookingDbToObject', () => {
	const row = {
		id: 7,
		dress_id_fk: 3,
		booking_type: 'rental',
		booking_date: pgDate(2030, 1, 9),
		start_date: pgDate(2030, 1, 10),
		end_date: pgDate(2030, 1, 12),
		customer_user_id_fk: null as string | null,
		renter_name: 'Priya Sharma',
		renter_email: null as string | null,
		renter_phone: '0218874402',
		renter_instagram: null as string | null,
		total_cost: '130.00',
		deposit_paid: null as string | null,
		tracking_number: null as string | null,
		status: 'pending',
		notes: null as string | null,
		cleaning_days: 2,
		blocked_from: pgDate(2030, 1, 10),
		blocked_to: pgDate(2030, 1, 14),
		created_at: new Date('2030-01-01T00:00:00Z'),
		updated_at: new Date('2030-01-01T00:00:00Z'),
	};

	it('produces the documented camelCase shape', () => {
		const [booking] = mapDressBookingDbToObject([row]);
		expectCamelCaseKeys(booking);
		expect(booking).toMatchObject({
			id: 7,
			dressIdFk: 3,
			bookingType: 'rental',
			customerUserIdFk: null,
			renterName: 'Priya Sharma',
			renterPhone: '0218874402',
			status: 'pending',
		});
	});

	it('renders DATE columns as YYYY-MM-DD calendar dates', () => {
		const [booking] = mapDressBookingDbToObject([row]);
		expect(booking.bookingDate).toBe('2030-01-09');
		expect(booking.startDate).toBe('2030-01-10');
		expect(booking.endDate).toBe('2030-01-12');
	});

	it('turns NUMERIC strings into numbers and keeps absent money as null', () => {
		const [booking] = mapDressBookingDbToObject([{ ...row, deposit_paid: '50.00' }]);
		expect(booking.totalCost).toBe(130);
		expect(booking.depositPaid).toBe(50);
		expect(mapDressBookingDbToObject([row])[0].depositPaid).toBeNull();
	});

	it('maps a zero deposit to 0, not null', () => {
		const [booking] = mapDressBookingDbToObject([{ ...row, deposit_paid: '0.00' }]);
		expect(booking.depositPaid).toBe(0);
	});
});

describe('mapDressDbToObject', () => {
	const row = {
		id: 1,
		user_id_fk: 'a9d84543-9197-4043-9319-be363c840b1c',
		name: 'Midnight Satin Slip',
		brand: 'Shona Joy',
		style: 'V-neck',
		dress_type: 'Evening',
		size: '8',
		condition: 'Excellent',
		fit_note: 'True to size',
		recommended_sizes: null as string[] | null,
		listing_type: 'rent',
		status: 'active',
		is_public: true,
		purchase_year: 2024,
		internal_name: 'EB-001',
		color: 'Black',
		rental_count: 9,
		rental_price_per_day: 65,
		purchase_price: 340,
		available_from: pgDate(2030, 2, 28) as Date | null,
		dress_photo_urls: null as string[] | null,
		blocked_date_ranges: [{ startDate: '2030-03-01', endDate: '2030-03-02' }],
		notes: null as string | null,
		unresolved_damage_count: '2',
		pending_booking_count: '1',
		created_at: new Date(),
		updated_at: new Date(),
	};

	it('produces camelCase keys only', () => {
		expectCamelCaseKeys(mapDressDbToObject([row])[0]);
	});

	it('renders available_from as YYYY-MM-DD, or null when unset', () => {
		expect(mapDressDbToObject([row])[0].availableFrom).toBe('2030-02-28');
		expect(mapDressDbToObject([{ ...row, available_from: null }])[0].availableFrom).toBeNull();
	});

	it('defaults array columns to empty arrays and parses COUNT(*) strings as numbers', () => {
		const [dress] = mapDressDbToObject([row]);
		expect(dress.recommendedSizes).toEqual([]);
		expect(dress.dressPhotoUrls).toEqual([]);
		expect(dress.blockedDateRanges).toEqual([{ startDate: '2030-03-01', endDate: '2030-03-02' }]);
		expect(dress.unresolvedDamageCount).toBe(2);
		expect(dress.pendingBookingCount).toBe(1);
	});
});

describe('mapDressDamageIncidentDbToObject', () => {
	it('maps to camelCase with YYYY-MM-DD dates and null for an unresolved incident', () => {
		const [incident] = mapDressDamageIncidentDbToObject([
			{
				id: 4,
				dress_id_fk: 3,
				booking_id_fk: null,
				description: 'Six sequins missing',
				photo_urls: null,
				occurred_at: pgDate(2030, 4, 5),
				is_public: false,
				resolved: false,
				resolution_notes: null,
				resolved_at: null,
				created_at: new Date(),
				updated_at: new Date(),
			},
		]);
		expectCamelCaseKeys(incident);
		expect(incident.occurredAt).toBe('2030-04-05');
		expect(incident.resolvedAt).toBeNull();
		expect(incident.photoUrls).toEqual([]);
		expect(incident.bookingIdFk).toBeNull();
	});
});

describe('mapBusinessDbToObject', () => {
	it('maps to camelCase and keeps the settings blob', () => {
		const [business] = mapBusinessDbToObject([
			{
				id: 1,
				name: "Elena's Boutique",
				category: 'dress_rental',
				owner_user_id_fk: 'a9d84543-9197-4043-9319-be363c840b1c',
				business_settings: { deliveryOption: 'both', cleaningBufferDays: 2 },
				created_at: new Date(),
			},
		]);
		expectCamelCaseKeys(business);
		expect(business.ownerUserIdFk).toBe('a9d84543-9197-4043-9319-be363c840b1c');
		expect(business.businessSettings).toEqual({ deliveryOption: 'both', cleaningBufferDays: 2 });
	});
});
