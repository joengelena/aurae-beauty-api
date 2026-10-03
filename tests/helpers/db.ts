import crypto from 'crypto';
import { Pool } from 'pg';
import { pgConnectionConfig } from './testEnv';

/**
 * Test-side access to the shine_test database, on its own pool (separate
 * from the app's). Dates are selected as ::text in helpers so no timezone
 * conversion ever happens on the test side.
 */
let pool: Pool | null = null;

function testPool(): Pool {
	if (!pool) {
		const database = process.env.POSTGRES_DATABASE as string;
		if (!database || !/test/i.test(database)) {
			throw new Error(`Test DB helper refusing to connect to '${database}'`);
		}
		pool = new Pool({ ...pgConnectionConfig(database), max: 5 });
	}
	return pool;
}

export async function sql<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
	const result = await testPool().query(text, params);
	return result.rows as T[];
}

export async function closeTestDb(): Promise<void> {
	if (pool) {
		await pool.end();
		pool = null;
	}
}

// ── Dates ──────────────────────────────────────────────────────────────────

/** YYYY-MM-DD +/- n days, pure calendar arithmetic (no timezone). */
export function addDays(date: string, days: number): string {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d + days)).toISOString().substring(0, 10);
}

/** Today's calendar date in New Zealand — the marketplace's business date. */
export function nzToday(): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Pacific/Auckland',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(new Date());
}

/** A date n days after NZ today. Use generous offsets for "future" dates. */
export function future(days: number): string {
	return addDays(nzToday(), days);
}

/** CURRENT_DATE of the database — what the seed offsets are relative to. */
export async function dbToday(): Promise<string> {
	const [row] = await sql<{ today: string }>('SELECT CURRENT_DATE::text AS today');
	return row.today;
}

// ── Lookups ────────────────────────────────────────────────────────────────

export async function dressIdByCode(internalName: string): Promise<number> {
	const rows = await sql<{ id: number }>(
		'SELECT id FROM user_dresses WHERE internal_name = $1',
		[internalName]
	);
	if (rows.length !== 1) throw new Error(`Seed dress ${internalName} not found`);
	return rows[0].id;
}

export async function getBooking(id: number) {
	const rows = await sql(
		`SELECT id, dress_id_fk, booking_type, status, customer_user_id_fk, renter_name,
		        total_cost::float AS total_cost, cleaning_days, tracking_number, notes,
		        start_date::text AS start_date, end_date::text AS end_date,
		        blocked_from::text AS blocked_from, blocked_to::text AS blocked_to
		 FROM dress_bookings WHERE id = $1`,
		[id]
	);
	return rows[0] ?? null;
}

export async function statusEvents(bookingId: number) {
	return sql<{ from_status: string | null; to_status: string; actor_user_id_fk: string | null }>(
		`SELECT from_status, to_status, actor_user_id_fk
		 FROM booking_status_events WHERE booking_id_fk = $1 ORDER BY id`,
		[bookingId]
	);
}

// ── Factories (unique data so test files never depend on each other) ───────

function uniqueSuffix(): string {
	return crypto.randomBytes(4).toString('hex');
}

export async function createUser(
	overrides: Partial<{ firstName: string; lastName: string; location: string }> = {}
): Promise<string> {
	const id = crypto.randomUUID();
	await sql(
		`INSERT INTO "user" (id, first_name, last_name, email, location, phone_number)
		 VALUES ($1, $2, $3, $4, $5, '0210000000')`,
		[
			id,
			overrides.firstName ?? 'Test',
			overrides.lastName ?? `User${uniqueSuffix()}`,
			`user-${id}@example.com`,
			overrides.location ?? 'Christchurch City',
		]
	);
	return id;
}

/** A fresh user who owns a fresh business with the given turnaround. */
export async function createBusinessOwner(
	opts: { cleaningBufferDays?: number; location?: string } = {}
): Promise<{ userId: string; businessId: number }> {
	const userId = await createUser({ location: opts.location });
	const settings: Record<string, unknown> = { deliveryOption: 'both' };
	if (opts.cleaningBufferDays !== undefined) {
		settings.cleaningBufferDays = opts.cleaningBufferDays;
	}
	const [business] = await sql<{ id: number }>(
		`INSERT INTO business (name, owner_user_id_fk, business_settings)
		 VALUES ($1, $2, $3::jsonb) RETURNING id`,
		[`Test Boutique ${uniqueSuffix()}`, userId, JSON.stringify(settings)]
	);
	await sql(
		`INSERT INTO business_member (business_id_fk, user_id_fk, role) VALUES ($1, $2, 'owner')`,
		[business.id, userId]
	);
	return { userId, businessId: business.id };
}

export async function addMember(businessId: number, userId: string, role: 'owner' | 'staff') {
	await sql(
		`INSERT INTO business_member (business_id_fk, user_id_fk, role) VALUES ($1, $2, $3)`,
		[businessId, userId, role]
	);
}

export type DressOverrides = Partial<{
	name: string;
	brand: string;
	style: string;
	size: string;
	isPublic: boolean;
	status: 'active' | 'sold';
	listingType: 'rent' | 'sell';
	rentalPricePerDay: number | null;
	purchasePrice: number | null;
	photoUrls: string[];
	blockedDateRanges: { startDate: string; endDate: string }[];
}>;

export async function createDress(ownerUserId: string, o: DressOverrides = {}): Promise<number> {
	const suffix = uniqueSuffix();
	const [row] = await sql<{ id: number }>(
		`INSERT INTO user_dresses (
			user_id_fk, internal_name, name, brand, style, size, condition, color,
			listing_type, status, is_public, rental_price_per_day, purchase_price,
			dress_photo_urls, blocked_date_ranges
		) VALUES ($1, $2, $3, $4, $5, $6, 'Excellent', 'Black', $7, $8, $9, $10, $11, $12, $13::jsonb)
		RETURNING id`,
		[
			ownerUserId,
			`T-${suffix}`,
			o.name ?? `Test Dress ${suffix}`,
			o.brand ?? `TestBrand ${suffix}`,
			o.style ?? 'V-neck',
			o.size ?? '10',
			o.listingType ?? 'rent',
			o.status ?? 'active',
			o.isPublic ?? true,
			o.rentalPricePerDay === undefined ? 50 : o.rentalPricePerDay,
			o.purchasePrice === undefined ? 400 : o.purchasePrice,
			o.photoUrls ?? [],
			JSON.stringify(o.blockedDateRanges ?? []),
		]
	);
	return row.id;
}

export async function insertBooking(b: {
	dressId: number;
	start: string;
	end: string;
	status?: string;
	bookingType?: string;
	customerUserId?: string | null;
	trackingNumber?: string | null;
}): Promise<number> {
	const [row] = await sql<{ id: number }>(
		`INSERT INTO dress_bookings (
			dress_id_fk, booking_type, booking_date, start_date, end_date,
			customer_user_id_fk, renter_name, total_cost, status, tracking_number
		) VALUES ($1, $2, $3, $3, $4, $5, 'Direct Insert', 0, $6, $7)
		RETURNING id`,
		[
			b.dressId,
			b.bookingType ?? 'rental',
			b.start,
			b.end,
			b.customerUserId ?? null,
			b.status ?? 'pending',
			b.trackingNumber ?? null,
		]
	);
	return row.id;
}

/** Runs fn and returns the Postgres error code it raised (or null). */
export async function pgErrorCode(fn: () => Promise<unknown>): Promise<string | null> {
	try {
		await fn();
		return null;
	} catch (error: any) {
		return error.code ?? 'UNKNOWN';
	}
}
