import { useApi } from '../helpers/app';
import { addDays, createBusinessOwner, createDress, createUser, future, insertBooking, nzToday, sql } from '../helpers/db';

describe('Cart and favourites', () => {
	const api = useApi();
	let owner: string;
	let shopper: string;
	let otherShopper: string;

	beforeAll(async () => {
		owner = (await createBusinessOwner({ cleaningBufferDays: 2 })).userId;
		shopper = await createUser({ firstName: 'Shopper' });
		otherShopper = await createUser({ firstName: 'Other' });
	});

	const addToCart = (dressId: number, startDate: string, endDate: string, as = shopper) =>
		api.post('/user/cart', { dressId, startDate, endDate }, as);

	const cartOf = async (as: string) => {
		const res = await api.get('/user/cart', as);
		expect(res.status).toBe(200);
		return res.body as any[];
	};

	describe('cart', () => {
		it('adds a dress for free dates and snapshots the day rate it was added at', async () => {
			const dressId = await createDress(owner, { rentalPricePerDay: 60 });
			const res = await addToCart(dressId, future(40), future(42));
			expect(res.status).toBe(201);

			await sql('UPDATE user_dresses SET rental_price_per_day = 999 WHERE id = $1', [dressId]);

			const item = (await cartOf(shopper)).find((i) => i.id === res.body.cartItemId);
			expect(item).toMatchObject({
				dressIdFk: dressId,
				startDate: future(40),
				endDate: future(42),
				pricePerDay: 60,
				isAvailable: true,
			});
		});

		it('validates dates like a booking: reversed or past starts are a 400', async () => {
			const dressId = await createDress(owner);
			expect((await addToCart(dressId, future(45), future(40))).status).toBe(400);
			expect((await addToCart(dressId, addDays(nzToday(), -2), future(1))).status).toBe(400);
			expect(await sql('SELECT id FROM cart_items WHERE dress_id_fk = $1', [dressId])).toHaveLength(0);
		});

		it('refuses dates the dress is already booked for, including turnaround (409)', async () => {
			const dressId = await createDress(owner);
			await insertBooking({ dressId, start: future(40), end: future(42), status: 'approved' });
			expect((await addToCart(dressId, future(41), future(41))).status).toBe(409);
			expect((await addToCart(dressId, future(44), future(45))).status).toBe(409);
			expect((await addToCart(dressId, future(45), future(46))).status).toBe(201);
		});

		it('refuses private and sold dresses (404)', async () => {
			const privateDress = await createDress(owner, { isPublic: false });
			const soldDress = await createDress(owner, { status: 'sold' });
			expect((await addToCart(privateDress, future(40), future(41))).status).toBe(404);
			expect((await addToCart(soldDress, future(40), future(41))).status).toBe(404);
		});

		it('lets an owner put her own dress in her cart', async () => {
			const dressId = await createDress(owner);
			expect((await addToCart(dressId, future(50), future(51), owner)).status).toBe(201);
		});

		it('refuses the same dress twice for overlapping dates', async () => {
			const dressId = await createDress(owner);
			expect((await addToCart(dressId, future(40), future(42))).status).toBe(201);
			expect((await addToCart(dressId, future(42), future(43))).status).toBe(409);
			expect(await sql('SELECT id FROM cart_items WHERE dress_id_fk = $1', [dressId])).toHaveLength(1);
		});

		it("shows each user only their own cart", async () => {
			const dressId = await createDress(owner);
			const mine = await addToCart(dressId, future(60), future(61), shopper);
			const theirs = await addToCart(dressId, future(70), future(71), otherShopper);

			const ids = (await cartOf(shopper)).map((i) => i.id);
			expect(ids).toContain(mine.body.cartItemId);
			expect(ids).not.toContain(theirs.body.cartItemId);

			const owners = await sql<{ user_id_fk: string }>('SELECT DISTINCT user_id_fk FROM cart_items WHERE id = ANY($1::int[])', [ids]);
			expect(owners).toEqual([{ user_id_fk: shopper }]);
		});

		it('flags items that have become unbookable since they were added', async () => {
			const goesPrivate = await createDress(owner);
			const getsSold = await createDress(owner);
			const getsBooked = await createDress(owner);
			const stillFine = await createDress(owner);
			const u = await createUser();
			for (const d of [goesPrivate, getsSold, getsBooked, stillFine]) {
				expect((await addToCart(d, future(80), future(81), u)).status).toBe(201);
			}

			await sql('UPDATE user_dresses SET is_public = FALSE WHERE id = $1', [goesPrivate]);
			await sql(`UPDATE user_dresses SET status = 'sold' WHERE id = $1`, [getsSold]);
			await insertBooking({ dressId: getsBooked, start: future(79), end: future(80), status: 'approved' });

			const byDress = Object.fromEntries((await cartOf(u)).map((i) => [i.dressIdFk, i.isAvailable]));
			expect(byDress).toEqual({ [goesPrivate]: false, [getsSold]: false, [getsBooked]: false, [stillFine]: true });
		});

		it("cannot remove someone else's cart item", async () => {
			const dressId = await createDress(owner);
			const theirs = await addToCart(dressId, future(90), future(91), otherShopper);

			expect((await api.delete(`/user/cart/${theirs.body.cartItemId}`, shopper)).status).toBe(404);
			expect(await sql('SELECT id FROM cart_items WHERE id = $1', [theirs.body.cartItemId])).toHaveLength(1);

			expect((await api.delete(`/user/cart/${theirs.body.cartItemId}`, otherShopper)).status).toBe(200);
			expect(await sql('SELECT id FROM cart_items WHERE id = $1', [theirs.body.cartItemId])).toHaveLength(0);
		});

		it('answers a malformed cart item id with a 400', async () => {
			expect((await api.delete('/user/cart/abc', shopper)).status).toBe(400);
		});
	});

	describe('favourites (watchlist)', () => {
		const add = (dressId: number | string, as = shopper) => api.post(`/user/watchlist-add/${dressId}`, {}, as);
		const list = async (as = shopper) => {
			const res = await api.get('/user/watchlist', as);
			expect(res.status).toBe(200);
			return (res.body as any[]).map((d) => d.id);
		};

		it('favourites a public dress and lists it', async () => {
			const dressId = await createDress(owner);
			const res = await add(dressId);
			expect(res.status).toBeGreaterThanOrEqual(200);
			expect(res.status).toBeLessThan(300);
			expect(await list()).toContain(dressId);
		});

		it('refuses private and sold dresses (404)', async () => {
			const privateDress = await createDress(owner, { isPublic: false });
			const soldDress = await createDress(owner, { status: 'sold' });
			expect((await add(privateDress)).status).toBe(404);
			expect((await add(soldDress)).status).toBe(404);
			expect(await sql('SELECT 1 FROM watchlist WHERE dress_id_fk = ANY($1::int[])', [[privateDress, soldDress]])).toHaveLength(0);
		});

		it('refuses a duplicate (409)', async () => {
			const dressId = await createDress(owner);
			await add(dressId);
			expect((await add(dressId)).status).toBe(409);
		});

		it('drops dresses from the list once they go private or are sold', async () => {
			const u = await createUser();
			const a = await createDress(owner);
			const b = await createDress(owner);
			const c = await createDress(owner);
			for (const d of [a, b, c]) await add(d, u);

			await sql('UPDATE user_dresses SET is_public = FALSE WHERE id = $1', [a]);
			await sql(`UPDATE user_dresses SET status = 'sold' WHERE id = $1`, [b]);
			expect(await list(u)).toEqual([c]);
		});

		it('answers malformed ids with a 400 and unknown dresses with a 404', async () => {
			expect((await add('abc')).status).toBe(400);
			expect((await add(2000000000)).status).toBe(404);
			expect((await api.delete('/user/watchlist-remove/abc', shopper)).status).toBe(400);
			expect((await api.delete('/user/watchlist-remove/2000000000', shopper)).status).toBe(404);
		});
	});
});
