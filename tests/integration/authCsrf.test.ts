import { useApi } from '../helpers/app';
import { createBusinessOwner, createDress, dressIdByCode, future, sql } from '../helpers/db';
import { CHARLOTTE, OLIVIA } from '../helpers/seed';
import { supabaseAdmin } from '../../src/config/supabase';

/**
 * Authentication, the x-client-type CSRF guard, and what an error response is
 * allowed to say.
 */
describe('Auth, CSRF and error hygiene', () => {
	const api = useApi();

	it('protected routes answer 401 without a token', async () => {
		const eb001 = await dressIdByCode('EB-001');
		const results = {
			'GET /user/dresses': (await api.get('/user/dresses')).status,
			'GET /user/cart': (await api.get('/user/cart')).status,
			'GET /user/my-bookings': (await api.get('/user/my-bookings')).status,
			'GET /business/mine': (await api.get('/business/mine')).status,
			'POST /dresses/:id/book': (await api.post(`/dresses/${eb001}/book`, { startDate: future(300), endDate: future(301) })).status,
			'POST /user/cart': (await api.post('/user/cart', { dressId: eb001, startDate: future(300), endDate: future(301) })).status,
		};
		expect(results).toEqual(Object.fromEntries(Object.keys(results).map((k) => [k, 401])));
	});

	it('a token Supabase rejects is a 401, by header or cookie', async () => {
		const header = await api.get('/user/dresses').set('Authorization', 'Bearer forged.jwt.token');
		expect(header.status).toBe(401);
		const cookie = await api.get('/user/dresses').set('Cookie', 'sb-access-token=forged.jwt.token');
		expect(cookie.status).toBe(401);
		expect(supabaseAdmin.auth.getUser).toHaveBeenCalledWith('forged.jwt.token');
	});

	it('refuses a state-changing request without x-client-type (403) and changes nothing', async () => {
		const owner = (await createBusinessOwner()).userId;
		const dressId = await createDress(owner);

		const cart = await api.post('/user/cart', { dressId, startDate: future(300), endDate: future(301) }, OLIVIA, { clientType: null });
		expect(cart.status).toBe(403);
		const del = await api.delete(`/user/dresses/${dressId}`, owner, { clientType: null });
		expect(del.status).toBe(403);
		const forged = await api.delete(`/user/dresses/${dressId}`, owner, { clientType: 'evil' });
		expect(forged.status).toBe(403);

		expect(await sql('SELECT id FROM cart_items WHERE dress_id_fk = $1', [dressId])).toHaveLength(0);
		expect(await sql('SELECT id FROM user_dresses WHERE id = $1', [dressId])).toHaveLength(1);
	});

	it('ignores a currentUserId sent by the client: the verified token decides who you are', async () => {
		const owner = (await createBusinessOwner()).userId;
		const dressId = await createDress(owner);

		const res = await api.post('/user/cart', { dressId, startDate: future(310), endDate: future(311), currentUserId: CHARLOTTE }, OLIVIA);
		expect(res.status).toBe(201);
		const rows = await sql('SELECT user_id_fk FROM cart_items WHERE dress_id_fk = $1', [dressId]);
		expect(rows).toEqual([{ user_id_fk: OLIVIA }]);
	});

	it('never leaks raw SQL or Postgres error text in a response', async () => {
		const leak = /select |insert |update |delete from|syntax|relation|column|violates|out of range|invalid input|constraint|trigger|\$\d|pg_|ERROR:/i;
		const eb001 = await dressIdByCode('EB-001');
		const responses = [
			await api.delete('/user/cart/abc', OLIVIA),
			await api.delete('/user/watchlist-remove/abc', OLIVIA),
			await api.get('/dresses/99999999999/bookings'),
			await api.post('/user/cart', { dressId: 99999999999, startDate: future(300), endDate: future(301) }, OLIVIA),
			await api.post(`/user/watchlist-add/99999999999`, {}, OLIVIA),
			await api.post(`/dresses/${eb001}/book`, { startDate: '2030-02-30', endDate: '2030-03-01' }, OLIVIA),
		];
		for (const res of responses) {
			expect(JSON.stringify(res.body)).not.toMatch(leak);
		}
	});

	it('the health check is public and reports the database', async () => {
		const res = await api.get('/health');
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ status: 'healthy', database: 'connected' });
	});
});
