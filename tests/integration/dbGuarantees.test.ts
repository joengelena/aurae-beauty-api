import {
	addDays,
	closeTestDb,
	createBusinessOwner,
	createDress,
	getBooking,
	insertBooking,
	pgErrorCode,
	sql,
	statusEvents,
	future,
	dbToday,
} from '../helpers/db';

/**
 * What the database guarantees on its own, whatever write path is used
 * (DressBookings.sql, 99_triggers.sql, 97_views.sql). Direct SQL only.
 */
describe('Database guarantees', () => {
	const EXCLUSION_VIOLATION = '23P01';
	const CHECK_VIOLATION = '23514';
	let owner: string;

	beforeAll(async () => {
		owner = (await createBusinessOwner({ cleaningBufferDays: 2 })).userId;
	});

	afterAll(async () => {
		await closeTestDb();
	});

	describe('no_double_booking', () => {
		it('rejects an overlapping booking inserted directly', async () => {
			const dressId = await createDress(owner);
			await insertBooking({ dressId, start: future(10), end: future(12) });
			expect(await pgErrorCode(() => insertBooking({ dressId, start: future(12), end: future(13) }))).toBe(EXCLUSION_VIOLATION);
			expect(await pgErrorCode(() => insertBooking({ dressId, start: future(5), end: future(20), status: 'approved' }))).toBe(EXCLUSION_VIOLATION);
		});

		it('includes the cleaning turnaround: end date + buffer days, inclusive', async () => {
			const dressId = await createDress(owner);
			await insertBooking({ dressId, start: future(10), end: future(12) }); // blocked through +14
			expect(await pgErrorCode(() => insertBooking({ dressId, start: future(14), end: future(15) }))).toBe(EXCLUSION_VIOLATION);
			expect(await pgErrorCode(() => insertBooking({ dressId, start: future(15), end: future(16) }))).toBeNull();
		});

		it('ignores declined and cancelled bookings, which release their dates', async () => {
			const dressId = await createDress(owner);
			await insertBooking({ dressId, start: future(10), end: future(12), status: 'approved' });
			for (const status of ['declined', 'cancelled_by_customer', 'cancelled_by_owner']) {
				expect({ status, code: await pgErrorCode(() => insertBooking({ dressId, start: future(10), end: future(12), status })) })
					.toEqual({ status, code: null });
			}

			const other = await createDress(owner);
			await insertBooking({ dressId: other, start: future(30), end: future(31), status: 'cancelled_by_customer' });
			expect(await pgErrorCode(() => insertBooking({ dressId: other, start: future(30), end: future(31) }))).toBeNull();
		});

		it('keys on the dress: the same dates on a different dress are fine', async () => {
			const a = await createDress(owner);
			const b = await createDress(owner);
			await insertBooking({ dressId: a, start: future(10), end: future(12) });
			expect(await pgErrorCode(() => insertBooking({ dressId: b, start: future(10), end: future(12) }))).toBeNull();
		});
	});

	describe('cleaning_days snapshot', () => {
		it('does not move when the business changes its buffer afterwards', async () => {
			const own = await createBusinessOwner({ cleaningBufferDays: 2 });
			const dressId = await createDress(own.userId);
			const id = await insertBooking({ dressId, start: future(10), end: future(12) });
			expect(await getBooking(id)).toMatchObject({ cleaning_days: 2, blocked_to: future(14) });

			await sql(
				`UPDATE business SET business_settings = business_settings || '{"cleaningBufferDays": 5}'::jsonb WHERE id = $1`,
				[own.businessId]
			);
			expect(await getBooking(id)).toMatchObject({ cleaning_days: 2, blocked_to: future(14) });

			// Editing the booking keeps its own snapshot, not the new setting.
			await sql('UPDATE dress_bookings SET end_date = $1 WHERE id = $2', [future(13), id]);
			expect(await getBooking(id)).toMatchObject({ cleaning_days: 2, blocked_to: future(15) });

			// A booking taken now gets the new turnaround.
			const later = await insertBooking({ dressId, start: future(40), end: future(41) });
			expect(await getBooking(later)).toMatchObject({ cleaning_days: 5, blocked_to: future(46) });
		});

		it('cannot be forged by writing cleaning_days or the blocked window by hand', async () => {
			const dressId = await createDress(owner);
			const [{ id }] = await sql<{ id: number }>(
				`INSERT INTO dress_bookings (dress_id_fk, booking_date, start_date, end_date, renter_name, cleaning_days, blocked_from, blocked_to)
				 VALUES ($1, $2, $2, $3, 'Forger', 0, $2, $3) RETURNING id`,
				[dressId, future(10), future(12)]
			);
			expect(await getBooking(id)).toMatchObject({ cleaning_days: 2, blocked_to: future(14) });
		});

		it('clamps an out-of-range business buffer to 30 days', async () => {
			const own = await createBusinessOwner({ cleaningBufferDays: 99 });
			const dressId = await createDress(own.userId);
			const id = await insertBooking({ dressId, start: future(10), end: future(10) });
			expect((await getBooking(id)).cleaning_days).toBe(30);
		});

		it('gives purchases no turnaround', async () => {
			const dressId = await createDress(owner, { listingType: 'sell' });
			const id = await insertBooking({ dressId, start: future(10), end: future(10), bookingType: 'purchase' });
			expect(await getBooking(id)).toMatchObject({ cleaning_days: 0, blocked_to: future(10) });
			expect(await pgErrorCode(() => insertBooking({ dressId, start: future(11), end: future(12) }))).toBeNull();
		});
	});

	describe('status state machine and audit trail', () => {
		it('guards direct UPDATEs too: illegal moves and shipping without tracking fail', async () => {
			const dressId = await createDress(owner);
			const id = await insertBooking({ dressId, start: future(10), end: future(11) });
			expect(await pgErrorCode(() => sql(`UPDATE dress_bookings SET status = 'completed' WHERE id = $1`, [id]))).toBe(CHECK_VIOLATION);

			await sql(`UPDATE dress_bookings SET status = 'approved' WHERE id = $1`, [id]);
			await sql(`UPDATE dress_bookings SET status = 'ready_to_ship' WHERE id = $1`, [id]);
			expect(await pgErrorCode(() => sql(`UPDATE dress_bookings SET status = 'shipped' WHERE id = $1`, [id]))).toBe(CHECK_VIOLATION);
			expect(await pgErrorCode(() => sql(`UPDATE dress_bookings SET status = 'shipped', tracking_number = '  ' WHERE id = $1`, [id]))).toBe(CHECK_VIOLATION);
			expect((await getBooking(id)).status).toBe('ready_to_ship');
		});

		it('logs creation and every status change, attributing it to app.actor_user_id when set', async () => {
			const dressId = await createDress(owner);
			const id = await insertBooking({ dressId, start: future(10), end: future(11) });
			await sql(
				`BEGIN; SELECT set_config('app.actor_user_id', '${owner}', true);
				 UPDATE dress_bookings SET status = 'approved' WHERE id = ${id}; COMMIT;`
			);
			await sql(`UPDATE dress_bookings SET notes = 'not a status change' WHERE id = $1`, [id]);

			expect(await statusEvents(id)).toEqual([
				{ from_status: null, to_status: 'pending', actor_user_id_fk: null },
				{ from_status: 'pending', to_status: 'approved', actor_user_id_fk: owner },
			]);
		});

		it('refuses a booking that ends before it starts', async () => {
			const dressId = await createDress(owner);
			expect(await pgErrorCode(() => insertBooking({ dressId, start: future(12), end: future(10) }))).not.toBeNull();
		});
	});

	describe('booking_details.is_overdue', () => {
		it('is true only when the dress is physically out (collected/shipped) past its end date', async () => {
			const today = await dbToday();
			const dressId = await createDress(owner);
			const ids: Record<string, number> = {};
			const cases: [string, number, number][] = [
				['collected', -20, -18],
				['shipped', -14, -12],
				['pending', -8, -7],
				['returned', -4, -4],
			];
			for (const [status, s, e] of cases) {
				ids[status] = await insertBooking({
					dressId,
					start: addDays(today, s),
					end: addDays(today, e),
					status,
					trackingNumber: status === 'shipped' ? 'NZP-1' : null,
				});
			}
			const collectedNotYetDue = await insertBooking({ dressId, start: addDays(today, -1), end: addDays(today, 1), status: 'collected' });

			const rows = await sql<{ id: number; is_overdue: boolean }>(
				'SELECT id, is_overdue FROM booking_details WHERE dress_id_fk = $1',
				[dressId]
			);
			const overdue = Object.fromEntries(rows.map((r) => [r.id, r.is_overdue]));
			expect(overdue[ids.collected]).toBe(true);
			expect(overdue[ids.shipped]).toBe(true);
			expect(overdue[ids.pending]).toBe(false);
			expect(overdue[ids.returned]).toBe(false);
			expect(overdue[collectedNotYetDue]).toBe(false);
		});
	});
});
