import { useApi } from '../helpers/app';
import {
	addDays,
	createBusinessOwner,
	createDress,
	createUser,
	addMember,
	future,
	getBooking,
	insertBooking,
	nzToday,
	sql,
	statusEvents,
} from '../helpers/db';

/**
 * Booking rules: renter self-booking, the owner's booking management, the
 * status state machine (99_triggers.sql) and renter cancellation.
 *
 * Every test books its own fresh dress at a fresh boutique (2-day turnaround),
 * so nothing here depends on the seed calendar or on test order.
 */
describe('Bookings', () => {
	const api = useApi();
	const BUFFER = 2;
	let owner: string;
	let staff: string;
	let renter: string;
	let otherRenter: string;

	beforeAll(async () => {
		const business = await createBusinessOwner({ cleaningBufferDays: BUFFER });
		owner = business.userId;
		staff = await createUser({ firstName: 'Staff' });
		await addMember(business.businessId, staff, 'staff');
		renter = await createUser({ firstName: 'Renter', lastName: 'One' });
		otherRenter = await createUser({ firstName: 'Renter', lastName: 'Two' });
	});

	const book = (dressId: number, startDate: string, endDate: string, as: string) =>
		api.post(`/dresses/${dressId}/book`, { startDate, endDate }, as);

	async function bookOk(dressId: number, startDate: string, endDate: string, as = renter): Promise<number> {
		const res = await book(dressId, startDate, endDate, as);
		expect(res.status).toBe(201);
		return res.body.bookingId;
	}

	const ownerPatch = (bookingId: number | string, body: object, as = owner) =>
		api.patch(`/user/dress-bookings/${bookingId}`, body, as);

	async function moveTo(bookingId: number, ...statuses: string[]) {
		for (const status of statuses) {
			const body: Record<string, string> = { status };
			if (status === 'shipped') body.trackingNumber = 'NZP-TEST-0001';
			const res = await ownerPatch(bookingId, body);
			expect({ to: status, status: res.status }).toEqual({ to: status, status: 200 });
		}
	}

	async function bookingCount(dressId: number): Promise<number> {
		const [row] = await sql<{ n: number }>('SELECT COUNT(*)::int AS n FROM dress_bookings WHERE dress_id_fk = $1', [dressId]);
		return row.n;
	}

	describe('renter self-booking (POST /dresses/:id/book)', () => {
		it("creates a pending rental for her own profile, priced nights x day rate, with the boutique's turnaround", async () => {
			const dressId = await createDress(owner, { rentalPricePerDay: 50 });
			const start = future(60);
			const end = future(63);

			const res = await book(dressId, start, end, renter);
			expect(res.status).toBe(201);
			expect(typeof res.body.bookingId).toBe('number');

			const booking = await getBooking(res.body.bookingId);
			expect(booking).toMatchObject({
				dress_id_fk: dressId,
				booking_type: 'rental',
				status: 'pending',
				customer_user_id_fk: renter,
				renter_name: expect.stringMatching(/^Renter One/),
				total_cost: 150, // 3 nights x $50
				start_date: start,
				end_date: end,
				cleaning_days: BUFFER,
				blocked_to: addDays(end, BUFFER),
			});
		});

		it('charges a same-day booking as one night', async () => {
			const dressId = await createDress(owner, { rentalPricePerDay: 80 });
			const id = await bookOk(dressId, future(61), future(61));
			expect((await getBooking(id)).total_cost).toBe(80);
		});

		it('refuses dates that overlap an existing booking (409)', async () => {
			const dressId = await createDress(owner);
			await bookOk(dressId, future(60), future(63));
			const res = await book(dressId, future(62), future(65), otherRenter);
			expect(res.status).toBe(409);
			expect(await bookingCount(dressId)).toBe(1);
		});

		it('treats the cleaning turnaround after a booking as unavailable', async () => {
			const dressId = await createDress(owner);
			await bookOk(dressId, future(60), future(62)); // blocked through +64
			expect((await book(dressId, future(63), future(63), otherRenter)).status).toBe(409);
			expect((await book(dressId, future(64), future(65), otherRenter)).status).toBe(409);
			expect((await book(dressId, future(65), future(66), otherRenter)).status).toBe(201);
		});

		it("refuses a booking whose own turnaround would run into the next booking", async () => {
			const dressId = await createDress(owner);
			await bookOk(dressId, future(70), future(72));
			// Ends +68, + 2 days turnaround = +70: collides with the booking starting +70.
			expect((await book(dressId, future(66), future(68), otherRenter)).status).toBe(409);
			// Ends +67, turnaround through +69: fits.
			expect((await book(dressId, future(66), future(67), otherRenter)).status).toBe(201);
		});

		it('refuses dates inside a range the owner blocked by hand (409)', async () => {
			const dressId = await createDress(owner, {
				blockedDateRanges: [{ startDate: future(80), endDate: future(82) }],
			});
			expect((await book(dressId, future(81), future(84), renter)).status).toBe(409);
			expect(await bookingCount(dressId)).toBe(0);
		});

		it('rejects reversed or malformed dates with a 400', async () => {
			const dressId = await createDress(owner);
			expect((await book(dressId, future(65), future(60), renter)).status).toBe(400);
			expect((await book(dressId, '2030-13-01', '2030-13-02', renter)).status).toBe(400);
			expect((await book(dressId, 'tomorrow', future(60), renter)).status).toBe(400);
			expect(await bookingCount(dressId)).toBe(0);
		});

		it('rejects a start date in the past (NZ calendar) but accepts today', async () => {
			const dressId = await createDress(owner);
			expect((await book(dressId, addDays(nzToday(), -1), future(2), renter)).status).toBe(400);
			expect(await bookingCount(dressId)).toBe(0);
			expect((await book(dressId, nzToday(), nzToday(), renter)).status).toBe(201);
		});

		it('404s for a private or sold dress and creates nothing', async () => {
			const privateDress = await createDress(owner, { isPublic: false });
			const soldDress = await createDress(owner, { isPublic: true, status: 'sold' });
			expect((await book(privateDress, future(60), future(61), renter)).status).toBe(404);
			expect((await book(soldDress, future(60), future(61), renter)).status).toBe(404);
			expect(await bookingCount(privateDress)).toBe(0);
			expect(await bookingCount(soldDress)).toBe(0);
		});

		it('lets an owner book her own dress as a customer', async () => {
			const dressId = await createDress(owner);
			const id = await bookOk(dressId, future(90), future(91), owner);
			expect((await getBooking(id)).customer_user_id_fk).toBe(owner);
		});
	});

	describe("renter's own bookings (GET /user/my-bookings)", () => {
		it("lists only her bookings, with calendar dates and the dress's public name, never its internal code", async () => {
			const dressId = await createDress(owner, { name: 'Public Listing Name' });
			const [{ internal_name }] = await sql('SELECT internal_name FROM user_dresses WHERE id = $1', [dressId]);
			const mine = await bookOk(dressId, future(100), future(101), renter);
			const theirs = await bookOk(dressId, future(110), future(111), otherRenter);

			const res = await api.get('/user/my-bookings', renter);
			expect(res.status).toBe(200);
			const ids = res.body.map((b: any) => b.id);
			expect(ids).toContain(mine);
			expect(ids).not.toContain(theirs);
			for (const b of res.body) expect(b.customerUserIdFk).toBe(renter);

			const row = res.body.find((b: any) => b.id === mine);
			expect(row).toMatchObject({ startDate: future(100), endDate: future(101), dressName: 'Public Listing Name' });
			expect(JSON.stringify(res.body)).not.toContain(internal_name);
		});

		it("does not attach an owner-entered booking to a customer's account by matching her email", async () => {
			const dressId = await createDress(owner);
			const [{ email }] = await sql('SELECT email FROM "user" WHERE id = $1', [renter]);
			const res = await api.post(
				'/user/dress-bookings',
				{ dressIdFk: dressId, startDate: future(120), endDate: future(121), renterName: 'Taken by DM', renterEmail: email },
				owner
			);
			expect(res.status).toBe(201);
			expect((await getBooking(res.body.bookingId)).customer_user_id_fk).toBeNull();

			const mine = await api.get('/user/my-bookings', renter);
			expect(mine.body.map((b: any) => b.id)).not.toContain(res.body.bookingId);
		});
	});

	describe('owner booking management', () => {
		it('owner-created bookings use the same conflict check and may record past dates', async () => {
			const dressId = await createDress(owner);
			await bookOk(dressId, future(60), future(62));
			const create = (startDate: string, endDate: string) =>
				api.post('/user/dress-bookings', { dressIdFk: dressId, startDate, endDate, renterName: 'Walk-in' }, owner);

			expect((await create(future(61), future(61))).status).toBe(409);
			expect((await create(future(64), future(64))).status).toBe(409); // inside turnaround
			expect((await create(future(80), future(79))).status).toBe(400);
			expect((await create(addDays(nzToday(), -30), addDays(nzToday(), -28))).status).toBe(201);
		});

		it('owner date edits are conflict-checked against other bookings', async () => {
			const dressId = await createDress(owner);
			await bookOk(dressId, future(60), future(62));
			const second = await bookOk(dressId, future(70), future(71), otherRenter);

			expect((await ownerPatch(second, { startDate: future(63), endDate: future(64) })).status).toBe(409);
			expect((await ownerPatch(second, { startDate: future(75), endDate: future(74) })).status).toBe(400);
			expect((await getBooking(second)).start_date).toBe(future(70));

			expect((await ownerPatch(second, { startDate: future(72), endDate: future(73) })).status).toBe(200);
			expect(await getBooking(second)).toMatchObject({
				start_date: future(72),
				end_date: future(73),
				blocked_to: addDays(future(73), BUFFER),
			});
		});

		it('walks a rental through its full cycle and records every move with who made it', async () => {
			const dressId = await createDress(owner);
			const id = await bookOk(dressId, future(60), future(61));

			await moveTo(id, 'approved', 'ready_to_ship', 'shipped', 'returned', 'inspected', 'completed');

			const booking = await getBooking(id);
			expect(booking.status).toBe('completed');
			expect(booking.tracking_number).toBe('NZP-TEST-0001');

			const events = await statusEvents(id);
			expect(events.map((e) => [e.from_status, e.to_status])).toEqual([
				[null, 'pending'],
				['pending', 'approved'],
				['approved', 'ready_to_ship'],
				['ready_to_ship', 'shipped'],
				['shipped', 'returned'],
				['returned', 'inspected'],
				['inspected', 'completed'],
			]);
			for (const e of events.slice(1)) expect(e.actor_user_id_fk).toBe(owner);
		});

		it('rejects illegal transitions with a 4xx (not a 500) and leaves the booking untouched', async () => {
			const dressId = await createDress(owner);
			const id = await bookOk(dressId, future(60), future(61));

			for (const illegal of ['completed', 'returned', 'inspected', 'collected', 'ready_to_ship']) {
				const res = await ownerPatch(id, { status: illegal });
				expect({ to: illegal, ok: res.status >= 400 && res.status < 500 }).toEqual({ to: illegal, ok: true });
				expect(JSON.stringify(res.body)).not.toMatch(/Illegal booking transition|trigger|check_violation/i);
			}
			expect((await getBooking(id)).status).toBe('pending');

			await moveTo(id, 'approved');
			const back = await ownerPatch(id, { status: 'pending' });
			expect(back.status).toBeGreaterThanOrEqual(400);
			expect(back.status).toBeLessThan(500);
			expect((await getBooking(id)).status).toBe('approved');
		});

		it('treats declined and cancelled as final', async () => {
			const dressId = await createDress(owner);
			const declined = await bookOk(dressId, future(60), future(61));
			await moveTo(declined, 'declined');
			const reopen = await ownerPatch(declined, { status: 'approved' });
			expect(reopen.status).toBeGreaterThanOrEqual(400);
			expect(reopen.status).toBeLessThan(500);

			const cancelled = await bookOk(dressId, future(70), future(71));
			await moveTo(cancelled, 'approved', 'cancelled_by_owner');
			const revive = await ownerPatch(cancelled, { status: 'ready_for_pickup' });
			expect(revive.status).toBeGreaterThanOrEqual(400);
			expect(revive.status).toBeLessThan(500);

			expect((await getBooking(declined)).status).toBe('declined');
			expect((await getBooking(cancelled)).status).toBe('cancelled_by_owner');
		});

		it("requires a tracking number before a booking can be marked 'shipped'", async () => {
			const dressId = await createDress(owner);
			const id = await bookOk(dressId, future(60), future(61));
			await moveTo(id, 'approved', 'ready_to_ship');

			const bare = await ownerPatch(id, { status: 'shipped' });
			expect(bare.status).toBeGreaterThanOrEqual(400);
			expect(bare.status).toBeLessThan(500);
			const blank = await ownerPatch(id, { status: 'shipped', trackingNumber: '   ' });
			expect(blank.status).toBeGreaterThanOrEqual(400);
			expect(blank.status).toBeLessThan(500);
			expect((await getBooking(id)).status).toBe('ready_to_ship');

			expect((await ownerPatch(id, { status: 'shipped', trackingNumber: 'NZP-LH1' })).status).toBe(200);
			expect(await getBooking(id)).toMatchObject({ status: 'shipped', tracking_number: 'NZP-LH1' });
		});

		it('runs a purchase through the short branch: it is never returned or inspected, and keeps no turnaround', async () => {
			const dressId = await createDress(owner, { listingType: 'sell', purchasePrice: 400 });
			const res = await api.post(
				'/user/dress-bookings',
				{ dressIdFk: dressId, bookingType: 'purchase', startDate: future(60), endDate: future(60), renterName: 'Buyer', totalCost: 400 },
				owner
			);
			expect(res.status).toBe(201);
			const id = res.body.bookingId;
			expect(await getBooking(id)).toMatchObject({ booking_type: 'purchase', cleaning_days: 0, blocked_to: future(60) });

			await moveTo(id, 'approved', 'ready_for_pickup', 'collected');
			const returned = await ownerPatch(id, { status: 'returned' });
			expect(returned.status).toBeGreaterThanOrEqual(400);
			expect(returned.status).toBeLessThan(500);
			await moveTo(id, 'completed');
		});

		it('never lets the booking type change after creation', async () => {
			const dressId = await createDress(owner);
			const id = await bookOk(dressId, future(60), future(61));

			const onlyType = await ownerPatch(id, { bookingType: 'purchase' });
			expect(onlyType.status).toBe(400);

			await ownerPatch(id, { bookingType: 'purchase', notes: 'Customer asked to buy it' });
			expect(await getBooking(id)).toMatchObject({ booking_type: 'rental', cleaning_days: BUFFER });
		});

		it("lets staff manage their business's bookings, attributing the change to them", async () => {
			const dressId = await createDress(owner);
			const id = await bookOk(dressId, future(60), future(61));

			const res = await ownerPatch(id, { status: 'approved' }, staff);
			expect(res.status).toBe(200);
			const events = await statusEvents(id);
			expect(events[events.length - 1]).toMatchObject({ from_status: 'pending', to_status: 'approved', actor_user_id_fk: staff });
		});

		it('answers malformed booking ids with a 400 and never acts on a different booking', async () => {
			const dressId = await createDress(owner);
			const id = await bookOk(dressId, future(60), future(61));

			const attempts: [string, () => Promise<{ status: number }>][] = [
				['PATCH dress-bookings/abc', () => ownerPatch('abc', { notes: 'x' })],
				['PATCH dress-bookings/<id>abc', () => ownerPatch(`${id}abc`, { notes: 'hijacked' })],
				['PATCH dress-bookings/99999999999', () => ownerPatch('99999999999', { notes: 'x' })],
				['PATCH my-bookings/abc/cancel', () => api.patch(`/user/my-bookings/abc/cancel`, {}, renter)],
				['PATCH my-bookings/<id>xyz/cancel', () => api.patch(`/user/my-bookings/${id}xyz/cancel`, {}, renter)],
				['GET user/dresses/abc/bookings', () => api.get(`/user/dresses/abc/bookings`, owner)],
			];
			const results: Record<string, number> = {};
			for (const [label, attempt] of attempts) results[label] = (await attempt()).status;
			expect(results).toEqual(Object.fromEntries(attempts.map(([label]) => [label, 400])));
			expect(await getBooking(id)).toMatchObject({ status: 'pending', notes: null });
		});

		it('404s for a booking that does not exist', async () => {
			expect((await ownerPatch(2000000000, { notes: 'x' })).status).toBe(404);
		});
	});

	describe('renter cancellation (PATCH /user/my-bookings/:id/cancel)', () => {
		const cancel = (id: number, as: string) => api.patch(`/user/my-bookings/${id}/cancel`, {}, as);

		it('cancels her own pending booking, records who did it, and frees the dates', async () => {
			const dressId = await createDress(owner);
			const id = await bookOk(dressId, future(60), future(62), renter);

			const res = await cancel(id, renter);
			expect(res.status).toBe(200);
			expect((await getBooking(id)).status).toBe('cancelled_by_customer');
			const events = await statusEvents(id);
			expect(events[events.length - 1]).toMatchObject({
				from_status: 'pending',
				to_status: 'cancelled_by_customer',
				actor_user_id_fk: renter,
			});

			expect((await book(dressId, future(60), future(62), otherRenter)).status).toBe(201);
		});

		it('cancels her own approved booking', async () => {
			const dressId = await createDress(owner);
			const id = await bookOk(dressId, future(60), future(61), renter);
			await moveTo(id, 'approved');
			expect((await cancel(id, renter)).status).toBe(200);
			expect((await getBooking(id)).status).toBe('cancelled_by_customer');
		});

		it("refuses to let anyone else cancel it, including on an owner-entered booking", async () => {
			const dressId = await createDress(owner);
			const id = await bookOk(dressId, future(60), future(61), renter);
			expect((await cancel(id, otherRenter)).status).toBe(403);
			expect((await getBooking(id)).status).toBe('pending');

			const manual = await insertBooking({ dressId, start: future(80), end: future(81), customerUserId: null });
			expect((await cancel(manual, renter)).status).toBe(403);
			expect((await getBooking(manual)).status).toBe('pending');
		});

		it('refuses once the dress is already with her', async () => {
			const dressId = await createDress(owner);
			const id = await bookOk(dressId, future(60), future(61), renter);
			await moveTo(id, 'approved', 'ready_for_pickup', 'collected');

			const res = await cancel(id, renter);
			expect(res.status).toBeGreaterThanOrEqual(400);
			expect(res.status).toBeLessThan(500);
			expect((await getBooking(id)).status).toBe('collected');
		});
	});
});
