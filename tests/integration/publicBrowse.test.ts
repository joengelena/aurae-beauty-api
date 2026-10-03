import { useApi } from '../helpers/app';
import { addDays, createBusinessOwner, dbToday, dressIdByCode, sql } from '../helpers/db';

/**
 * The public marketplace (no auth). A dress is visible to renters only while
 * it is public and not sold; everything else about it must be as invisible as
 * if it did not exist.
 */
describe('Public browse', () => {
	const api = useApi();

	async function fetchAllPages(query: string, limit = 50) {
		const first = await api.get(`/dresses?${query}&limit=${limit}&pageNumber=1`);
		expect(first.status).toBe(200);
		const items = [...first.body.data];
		for (let page = 2; page <= first.body.totalPages; page++) {
			const res = await api.get(`/dresses?${query}&limit=${limit}&pageNumber=${page}`);
			expect(res.status).toBe(200);
			items.push(...res.body.data);
		}
		return { items, totalRows: first.body.totalRows as number, totalPages: first.body.totalPages as number };
	}

	describe('GET /dresses', () => {
		it('never lists private or sold dresses (grouped or ungrouped)', async () => {
			const hidden = await sql<{ id: number }>(
				`SELECT id FROM user_dresses WHERE is_public = FALSE OR status = 'sold'`
			);
			const hiddenIds = new Set(hidden.map((r) => r.id));
			expect(hiddenIds.has(await dressIdByCode('EB-007'))).toBe(true); // private draft
			expect(hiddenIds.has(await dressIdByCode('EB-009'))).toBe(true); // sold

			for (const query of ['ungrouped=true', 'ungrouped=false']) {
				const { items } = await fetchAllPages(query);
				expect(items.length).toBeGreaterThan(0);
				for (const item of items) {
					expect(hiddenIds.has(item.id)).toBe(false);
				}
			}
		});

		it('groups the same dress stocked in several sizes into one tile listing every size', async () => {
			const s = await dressIdByCode('EB-004');
			const m = await dressIdByCode('EB-005');

			const grouped = await api.get('/dresses?brand=Significant%20Other&limit=50');
			expect(grouped.status).toBe(200);
			const tiles = grouped.body.data.filter((d: any) => d.id === s || d.id === m);
			expect(tiles).toHaveLength(1);
			expect([...tiles[0].availableSizes].sort()).toEqual(['M', 'S']);

			const ungrouped = await api.get('/dresses?brand=Significant%20Other&ungrouped=true&limit=50');
			const ids = ungrouped.body.data.map((d: any) => d.id);
			expect(ids).toEqual(expect.arrayContaining([s, m]));
		});

		it('brand filter returns only that brand', async () => {
			const { items } = await fetchAllPages('brand=Zimmermann&ungrouped=true');
			expect(items.map((d) => d.id).sort()).toEqual(
				[await dressIdByCode('EB-002'), await dressIdByCode('IA-103')].sort()
			);
			for (const item of items) expect(item.brand).toBe('Zimmermann');
		});

		it('size filter returns only that size', async () => {
			const { items } = await fetchAllPages('size=XS');
			expect(items.length).toBeGreaterThan(0);
			for (const item of items) expect(item.size).toBe('XS');
			expect(items.map((d) => d.id)).toEqual(
				expect.arrayContaining([await dressIdByCode('EB-006'), await dressIdByCode('KW-204')])
			);
		});

		it('location filter returns only dresses from boutiques in that location', async () => {
			const { items } = await fetchAllPages('location=Wellington&ungrouped=true');
			expect(items.length).toBeGreaterThan(0);
			for (const item of items) expect(item.location).toBe('Wellington');
			expect(items.map((d) => d.id)).toEqual(
				expect.arrayContaining([await dressIdByCode('KW-201'), await dressIdByCode('KW-205')])
			);
		});

		it('price range filter keeps the day rate within [priceFrom, priceTo]', async () => {
			const { items } = await fetchAllPages('priceFrom=50&priceTo=70&ungrouped=true');
			expect(items.length).toBeGreaterThan(0);
			for (const item of items) {
				expect(item.rentalPricePerDay).toBeGreaterThanOrEqual(50);
				expect(item.rentalPricePerDay).toBeLessThanOrEqual(70);
			}
			expect(items.map((d) => d.id)).toEqual(
				expect.arrayContaining([await dressIdByCode('EB-001'), await dressIdByCode('IA-101')])
			);
		});

		it('q searches name and brand, case-insensitively, and only matches what it should', async () => {
			const byName = await fetchAllPages('q=velvet&ungrouped=true');
			expect(byName.items.map((d) => d.id)).toEqual([await dressIdByCode('IA-102')]);

			const byBrand = await fetchAllPages('q=zimmermann&ungrouped=true');
			expect(byBrand.items.length).toBe(2);
			for (const item of byBrand.items) {
				expect(`${item.name} ${item.brand}`.toLowerCase()).toContain('zimmermann');
			}
		});

		it('q search never surfaces a private dress', async () => {
			// EB-007 'Navy Wrap Cocktail' is a private draft.
			const { items, totalRows } = await fetchAllPages('q=Navy%20Wrap&ungrouped=true');
			expect(items).toHaveLength(0);
			expect(totalRows).toBe(0);
		});

		it('pagination totals are consistent and every dress appears exactly once, even when listed at the same moment', async () => {
			// As many dresses as the seed has, created in one statement so they
			// share created_at (as seeded or bulk-imported stock does). Paging
			// must still return each one exactly once.
			const COUNT = 23;
			const { userId } = await createBusinessOwner();
			await sql(
				`INSERT INTO user_dresses (user_id_fk, name, brand, style, size, condition, is_public, rental_price_per_day)
				 SELECT $1, 'Paged ' || n, 'PageBrand ' || n, 'V-neck', '10', 'Excellent', TRUE, 40 + n
				 FROM generate_series(1, $2::int) AS n`,
				[userId, COUNT]
			);
			const limit = 4;

			for (const query of [`userId=${userId}`, `userId=${userId}&ungrouped=true`, `userId=${userId}&sortBy=uploadDateAsc`]) {
				const { items, totalRows, totalPages } = await fetchAllPages(query, limit);
				expect(totalRows).toBe(COUNT);
				expect(totalPages).toBe(Math.ceil(COUNT / limit));
				expect(items).toHaveLength(COUNT);
				expect({ query, distinct: new Set(items.map((d) => d.id)).size }).toEqual({ query, distinct: COUNT });
			}

			const beyond = await api.get(`/dresses?userId=${userId}&limit=${limit}&pageNumber=${Math.ceil(COUNT / limit) + 1}`);
			expect(beyond.status).toBe(200);
			expect(beyond.body.data).toEqual([]);
		});

		it('date filter hides a dress that is booked (or in turnaround) on those dates', async () => {
			const today = await dbToday();
			const eb001 = await dressIdByCode('EB-001'); // approved booking today+12..+14, 2-day buffer
			const query = (d: string) => `brand=Shona%20Joy&ungrouped=true&startDate=${d}&endDate=${d}`;

			const booked = await fetchAllPages(query(addDays(today, 13)));
			expect(booked.items.map((d) => d.id)).not.toContain(eb001);

			const turnaround = await fetchAllPages(query(addDays(today, 16)));
			expect(turnaround.items.map((d) => d.id)).not.toContain(eb001);

			const free = await fetchAllPages(query(addDays(today, 45)));
			expect(free.items.map((d) => d.id)).toContain(eb001);
		});
	});

	describe('GET /dresses/:id', () => {
		it('returns a public dress', async () => {
			const id = await dressIdByCode('EB-001');
			const res = await api.get(`/dresses/${id}`);
			expect(res.status).toBe(200);
			expect(res.body).toMatchObject({ id, brand: 'Shona Joy', name: 'Midnight Satin Slip' });
			expect(Array.isArray(res.body.imageUrls)).toBe(true);
		});

		it('404s for a private dress', async () => {
			const res = await api.get(`/dresses/${await dressIdByCode('EB-007')}`);
			expect(res.status).toBe(404);
			expect(JSON.stringify(res.body)).not.toContain('Navy Wrap');
		});

		it('404s for a sold dress', async () => {
			const res = await api.get(`/dresses/${await dressIdByCode('EB-009')}`);
			expect(res.status).toBe(404);
		});

		it("does not expose the owner's private internal stock code", async () => {
			const res = await api.get(`/dresses/${await dressIdByCode('EB-001')}`);
			expect(res.status).toBe(200);
			expect(JSON.stringify(res.body)).not.toContain('EB-001');
		});
	});

	describe('GET /dresses/:id/bookings (public availability)', () => {
		it('404s for a private dress', async () => {
			const res = await api.get(`/dresses/${await dressIdByCode('EB-007')}/bookings`);
			expect(res.status).toBe(404);
		});

		it('returns only date ranges that block the dress, with no renter details', async () => {
			const today = await dbToday();
			const res = await api.get(`/dresses/${await dressIdByCode('EB-004')}/bookings`);
			expect(res.status).toBe(200);

			for (const range of res.body) {
				expect(Object.keys(range).sort()).toEqual(['endDate', 'startDate', 'status']);
				expect(['declined', 'cancelled_by_customer', 'cancelled_by_owner']).not.toContain(range.status);
			}

			// EB-004: pending booking today+18..+20 with Elena's 2-day turnaround,
			// so +21 and +22 must also be unavailable.
			const covers = (d: string) => res.body.some((r: any) => r.startDate <= d && d <= r.endDate);
			expect(covers(addDays(today, 19))).toBe(true);
			expect(covers(addDays(today, 21))).toBe(true);
			expect(covers(addDays(today, 22))).toBe(true);
			// The cancelled booking on +15..+16 frees those days.
			expect(covers(addDays(today, 15))).toBe(false);
		});
	});

	describe('GET /dresses/:id/damage-incidents', () => {
		it('does not leak incidents of a private dress', async () => {
			const privateId = await dressIdByCode('EB-007');
			const [incident] = await sql<{ id: number }>(
				`INSERT INTO dress_damage_incidents (dress_id_fk, description, is_public)
				 VALUES ($1, 'Secret tear on a private draft', TRUE) RETURNING id`,
				[privateId]
			);
			try {
				const res = await api.get(`/dresses/${privateId}/damage-incidents`);
				expect(JSON.stringify(res.body)).not.toContain('Secret tear');
				expect([200, 404]).toContain(res.status);
			} finally {
				await sql('DELETE FROM dress_damage_incidents WHERE id = $1', [incident.id]);
			}
		});

		it('lists only public incidents of a public dress', async () => {
			const res = await api.get(`/dresses/${await dressIdByCode('EB-003')}/damage-incidents`);
			expect(res.status).toBe(200);
			expect(res.body.length).toBeGreaterThan(0);
			for (const incident of res.body) expect(incident.isPublic).toBe(true);
		});
	});

	it('answers malformed or out-of-range ids with a 400, never a 500', async () => {
		const paths = [
			'/dresses/abc',
			'/dresses/0',
			'/dresses/12abc',
			'/dresses/99999999999',
			'/dresses/abc/bookings',
			'/dresses/99999999999/bookings',
			'/dresses/abc/damage-incidents',
		];
		const results: Record<string, number> = {};
		for (const path of paths) results[path] = (await api.get(path)).status;
		expect(results).toEqual(Object.fromEntries(paths.map((p) => [p, 400])));
	});
});
