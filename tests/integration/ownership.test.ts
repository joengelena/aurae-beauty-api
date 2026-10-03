import { useApi } from '../helpers/app';
import { createDress, dressIdByCode, future, getBooking, insertBooking, sql } from '../helpers/db';
import { ELENA, GRACE, HANNAH, OLIVIA } from '../helpers/seed';

/**
 * Tenant isolation. A boutique's wardrobe, bookings and damage history belong
 * to that business: its owners and staff can use them, nobody else can.
 */
describe('Ownership and business scoping', () => {
	const api = useApi();

	const is4xx = (status: number) => status >= 400 && status < 500;

	it("another boutique's owner cannot read a dress from my wardrobe", async () => {
		const res = await api.get(`/user/dresses/${await dressIdByCode('EB-007')}`, HANNAH);
		expect([403, 404]).toContain(res.status);
		expect(JSON.stringify(res.body)).not.toContain('Navy Wrap');
	});

	it("another boutique's owner cannot edit or delete my dress", async () => {
		const dressId = await createDress(ELENA, { name: 'Original Name' });

		const patch = await api.patch(`/user/dresses/${dressId}`, { name: 'Hacked' }, HANNAH);
		expect([403, 404]).toContain(patch.status);
		const del = await api.delete(`/user/dresses/${dressId}`, HANNAH);
		expect([403, 404]).toContain(del.status);

		const [row] = await sql('SELECT name FROM user_dresses WHERE id = $1', [dressId]);
		expect(row).toEqual({ name: 'Original Name' });
	});

	it("another boutique's owner cannot see, change or delete my bookings", async () => {
		const dressId = await createDress(ELENA);
		const bookingId = await insertBooking({ dressId, start: future(200), end: future(201), customerUserId: OLIVIA });

		const list = await api.get(`/user/dresses/${dressId}/bookings`, HANNAH);
		expect([403, 404]).toContain(list.status);
		expect(JSON.stringify(list.body)).not.toContain('Direct Insert');

		expect((await api.patch(`/user/dress-bookings/${bookingId}`, { status: 'approved' }, HANNAH)).status).toBe(403);
		expect((await api.delete(`/user/dress-bookings/${bookingId}`, HANNAH)).status).toBe(403);
		expect(await getBooking(bookingId)).toMatchObject({ status: 'pending' });
	});

	it("an owner's booking list covers her own business only", async () => {
		const res = await api.get('/user/dress-bookings', HANNAH);
		expect(res.status).toBe(200);
		expect(res.body.length).toBeGreaterThan(0);
		const hannahDresses = new Set(
			(await sql<{ id: number }>('SELECT id FROM user_dresses WHERE user_id_fk = $1', [HANNAH])).map((r) => r.id)
		);
		for (const booking of res.body) expect(hannahDresses.has(booking.dressIdFk)).toBe(true);
	});

	it("another boutique's owner cannot see or touch my damage incidents", async () => {
		const eb003 = await dressIdByCode('EB-003');
		const [incident] = await sql<{ id: number }>(
			`SELECT id FROM dress_damage_incidents WHERE dress_id_fk = $1 ORDER BY id LIMIT 1`,
			[eb003]
		);

		const list = await api.get(`/user/dresses/${eb003}/damage-incidents`, HANNAH);
		expect([403, 404]).toContain(list.status);
		const patch = await api.patch(`/user/dresses/${eb003}/damage-incidents/${incident.id}`, { description: 'Hacked' }, HANNAH);
		expect([403, 404]).toContain(patch.status);
		const del = await api.delete(`/user/dresses/${eb003}/damage-incidents/${incident.id}`, HANNAH);
		expect([403, 404]).toContain(del.status);

		// Nor by pairing her own dress id with my incident id.
		const ia101 = await dressIdByCode('IA-101');
		const sneaky = await api.patch(`/user/dresses/${ia101}/damage-incidents/${incident.id}`, { description: 'Hacked' }, HANNAH);
		expect(sneaky.status).toBe(404);

		const [after] = await sql('SELECT description FROM dress_damage_incidents WHERE id = $1', [incident.id]);
		expect(after.description).not.toBe('Hacked');
	});

	it("staff see their business's whole wardrobe (including drafts and sold stock) and nothing else", async () => {
		const res = await api.get('/user/dresses', GRACE);
		expect(res.status).toBe(200);
		const expected = (await sql<{ id: number }>('SELECT id FROM user_dresses WHERE user_id_fk = $1', [ELENA])).map((r) => r.id);
		expect(res.body.map((d: any) => d.id).sort()).toEqual(expected.sort());
		expect(res.body.map((d: any) => d.internalName)).toEqual(expect.arrayContaining(['EB-007', 'EB-009']));

		const bookings = await api.get(`/user/dresses/${await dressIdByCode('EB-001')}/bookings`, GRACE);
		expect(bookings.status).toBe(200);
		expect(bookings.body.length).toBeGreaterThan(0);
	});

	it('a customer with no business cannot use the owner routes', async () => {
		expect((await api.get('/user/dresses', OLIVIA)).status).toBe(403);
		expect((await api.get('/user/dress-bookings', OLIVIA)).status).toBe(403);
		expect(is4xx((await api.get(`/user/dresses/${await dressIdByCode('EB-001')}`, OLIVIA)).status)).toBe(true);

		const dressId = await createDress(ELENA);
		const create = await api.post(
			'/user/dress-bookings',
			{ dressIdFk: dressId, startDate: future(210), endDate: future(211), renterName: 'Me' },
			OLIVIA
		);
		expect(is4xx(create.status)).toBe(true);
		const newDress = await api.post(
			'/user/dresses',
			{ brand: 'Shona Joy', style: 'V-neck', size: '8', condition: 'Excellent', rentalPricePerDay: 10 },
			OLIVIA
		);
		expect(newDress.status).toBe(403);

		const [{ n }] = await sql('SELECT COUNT(*)::int AS n FROM dress_bookings WHERE dress_id_fk = $1', [dressId]);
		expect(n).toBe(0);
	});

	it("an owner cannot record a booking on another boutique's dress", async () => {
		const dressId = await createDress(ELENA);
		const res = await api.post(
			'/user/dress-bookings',
			{ dressIdFk: dressId, startDate: future(220), endDate: future(221), renterName: 'Rival' },
			HANNAH
		);
		expect(is4xx(res.status)).toBe(true);
		const [{ n }] = await sql('SELECT COUNT(*)::int AS n FROM dress_bookings WHERE dress_id_fk = $1', [dressId]);
		expect(n).toBe(0);
	});

	it("a damage incident cannot be linked to another boutique's booking", async () => {
		const myDress = await createDress(ELENA);
		const [theirBooking] = await sql<{ id: number }>(
			`SELECT db.id FROM dress_bookings db JOIN user_dresses ud ON ud.id = db.dress_id_fk
			 WHERE ud.internal_name = 'IA-101' ORDER BY db.id LIMIT 1`
		);

		const res = await api.post(
			`/user/dresses/${myDress}/damage-incidents`,
			{ description: 'Linked to a rival booking', bookingIdFk: theirBooking.id },
			ELENA
		);
		expect(is4xx(res.status)).toBe(true);
		const rows = await sql('SELECT id FROM dress_damage_incidents WHERE booking_id_fk = $1 AND dress_id_fk = $2', [theirBooking.id, myDress]);
		expect(rows).toHaveLength(0);
	});
});
