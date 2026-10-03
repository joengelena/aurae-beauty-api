import { useApi } from '../helpers/app';
import { createBusinessOwner, createDress, sql } from '../helpers/db';
import { r2Calls } from '../helpers/mocks/r2Mock';
import { TEST_R2_PUBLIC_DOMAIN } from '../helpers/testEnv';
import { OLIVIA } from '../helpers/seed';

/**
 * Dress photo handling with R2 mocked: only a dress's own photos may be kept
 * or deleted, nothing is uploaded for a request that will be refused, and the
 * file limits are enforced.
 */
describe('Dress photo uploads', () => {
	const api = useApi();
	let owner: string;
	let rival: string;

	// A 1x1 PNG.
	const PNG = Buffer.from(
		'89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4f20000000049454e44ae426082',
		'hex'
	);
	const url = (key: string) => `${TEST_R2_PUBLIC_DOMAIN}/${key}`;

	beforeAll(async () => {
		owner = (await createBusinessOwner()).userId;
		rival = (await createBusinessOwner()).userId;
	});

	async function photosOf(dressId: number): Promise<string[]> {
		const [row] = await sql<{ dress_photo_urls: string[] | null }>('SELECT dress_photo_urls FROM user_dresses WHERE id = $1', [dressId]);
		return row.dress_photo_urls ?? [];
	}

	const patchDress = (dressId: number, as: string) => api.multipart('patch', `/user/dresses/${dressId}`, as);

	it("ignores a keepPhotoUrls entry the dress doesn't own: it is neither adopted nor deleted", async () => {
		const own1 = url('aurae/own-1.jpg');
		const own2 = url('aurae/own-2.jpg');
		const foreign = url('aurae/foreign.jpg');
		const dressId = await createDress(owner, { photoUrls: [own1, own2] });
		const rivalDress = await createDress(rival, { photoUrls: [foreign] });

		const res = await patchDress(dressId, owner).field('keepPhotoUrls', JSON.stringify([own1, foreign]));
		expect(res.status).toBe(200);

		expect(await photosOf(dressId)).toEqual([own1]);
		expect(await photosOf(rivalDress)).toEqual([foreign]);
		expect(r2Calls.deletes).toContain('aurae/own-2.jpg');
		expect(r2Calls.deletes).not.toContain('aurae/foreign.jpg');
		expect(r2Calls.deletes).not.toContain('aurae/own-1.jpg');
	});

	it('marking a dress sold without keepPhotoUrls keeps its photos', async () => {
		const photos = [url('aurae/sold-1.jpg'), url('aurae/sold-2.jpg')];
		const dressId = await createDress(owner, { photoUrls: photos });

		const res = await patchDress(dressId, owner).field('status', 'sold');
		expect(res.status).toBe(200);

		const [row] = await sql('SELECT status FROM user_dresses WHERE id = $1', [dressId]);
		expect(row.status).toBe('sold');
		expect(await photosOf(dressId)).toEqual(photos);
		expect(r2Calls.deletes).toEqual([]);
	});

	it('uploads new photos to R2 and appends them after the kept ones', async () => {
		const kept = url('aurae/kept.jpg');
		const dressId = await createDress(owner, { photoUrls: [kept, url('aurae/dropped.jpg')] });

		const res = await patchDress(dressId, owner)
			.field('keepPhotoUrls', JSON.stringify([kept]))
			.attach('images', PNG, { filename: 'new photo.png', contentType: 'image/png' });
		expect(res.status).toBe(200);

		expect(r2Calls.uploads).toHaveLength(1);
		expect(r2Calls.uploads[0].key).toMatch(/^aurae\/\d+-[a-z0-9]+-new_photo\.png$/);
		expect(await photosOf(dressId)).toEqual([kept, url(r2Calls.uploads[0].key)]);
		expect(r2Calls.deletes).toEqual(['aurae/dropped.jpg']);
	});

	it('rejects an oversize image with a 400 and uploads nothing', async () => {
		const dressId = await createDress(owner, { photoUrls: [url('aurae/a.jpg')] });
		const tooBig = Buffer.alloc(10 * 1024 * 1024 + 1, 0);

		const res = await patchDress(dressId, owner).attach('images', tooBig, { filename: 'huge.jpg', contentType: 'image/jpeg' });
		expect(res.status).toBe(400);
		expect(r2Calls.uploads).toEqual([]);
		expect(await photosOf(dressId)).toEqual([url('aurae/a.jpg')]);
	});

	it('rejects a non-image file with a 400 and uploads nothing', async () => {
		const dressId = await createDress(owner);
		const res = await patchDress(dressId, owner).attach('images', Buffer.from('%PDF-1.4'), { filename: 'doc.pdf', contentType: 'application/pdf' });
		expect(res.status).toBe(400);
		expect(r2Calls.uploads).toEqual([]);
	});

	it('rejects malformed keepPhotoUrls with a 400 and changes nothing', async () => {
		const photos = [url('aurae/m.jpg')];
		const dressId = await createDress(owner, { photoUrls: photos });
		const res = await patchDress(dressId, owner).field('keepPhotoUrls', '[not json');
		expect(res.status).toBe(400);
		expect(await photosOf(dressId)).toEqual(photos);
		expect(r2Calls.deletes).toEqual([]);
	});

	it("never stores files against someone else's dress, even with a forged currentUserId field", async () => {
		const dressId = await createDress(owner, { photoUrls: [url('aurae/mine.jpg')] });

		const res = await patchDress(dressId, rival)
			.field('currentUserId', owner)
			.field('keepPhotoUrls', '[]')
			.attach('images', PNG, { filename: 'x.png', contentType: 'image/png' });
		expect([403, 404]).toContain(res.status);
		expect(r2Calls.uploads).toEqual([]);
		expect(r2Calls.deletes).toEqual([]);
		expect(await photosOf(dressId)).toEqual([url('aurae/mine.jpg')]);
	});

	it('creating a dress needs a business: a customer gets a 403 and nothing is uploaded', async () => {
		const res = await api
			.multipart('post', '/user/dresses', OLIVIA)
			.field('brand', 'Shona Joy')
			.field('style', 'V-neck')
			.field('size', '8')
			.field('condition', 'Excellent')
			.field('rentalPricePerDay', '40')
			.attach('images', PNG, { filename: 'x.png', contentType: 'image/png' });
		expect(res.status).toBe(403);
		expect(r2Calls.uploads).toEqual([]);
	});

	it('creates a dress with its uploaded photo for an owner', async () => {
		const res = await api
			.multipart('post', '/user/dresses', owner)
			.field('brand', 'Shona Joy')
			.field('style', 'V-neck')
			.field('size', '8')
			.field('condition', 'Excellent')
			.field('rentalPricePerDay', '40')
			.attach('images', PNG, { filename: 'front.png', contentType: 'image/png' });
		expect(res.status).toBe(201);
		expect(r2Calls.uploads).toHaveLength(1);
		expect(res.body.dress).toMatchObject({
			userIdFk: owner,
			status: 'active',
			isPublic: false,
			dressPhotoUrls: [url(r2Calls.uploads[0].key)],
		});
	});

	it("deleting a dress removes its photos from R2", async () => {
		const dressId = await createDress(owner, { photoUrls: [url('aurae/del-1.jpg'), url('aurae/del-2.jpg')] });
		const res = await api.delete(`/user/dresses/${dressId}`, owner);
		expect(res.status).toBe(200);
		expect(await sql('SELECT id FROM user_dresses WHERE id = $1', [dressId])).toHaveLength(0);
		expect([...r2Calls.deletes].sort()).toEqual(['aurae/del-1.jpg', 'aurae/del-2.jpg']);
	});
});
