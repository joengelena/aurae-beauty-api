import { PoolClient } from 'pg';
import { useApi } from '../helpers/app';
import { createUser, sql } from '../helpers/db';
import { getPool } from '../../src/config/db';
import { ELENA, GRACE, HANNAH, OLIVIA } from '../helpers/seed';

/**
 * Businesses, membership and invites (FEATURES.md: Permissions, Invite Flow).
 */
describe('Business membership and invites', () => {
	const api = useApi();

	async function membershipOf(userId: string) {
		const rows = await sql('SELECT business_id_fk, role FROM business_member WHERE user_id_fk = $1', [userId]);
		return rows[0] ?? null;
	}

	/**
	 * Waits (briefly) for a membership write to become visible. Only used to
	 * set up preconditions: postBusiness/postRedeemInvite currently answer
	 * before they COMMIT, which the dedicated test below covers.
	 */
	async function settledMembershipOf(userId: string) {
		for (let i = 0; i < 50; i++) {
			const m = await membershipOf(userId);
			if (m) return m;
			await new Promise((r) => setTimeout(r, 20));
		}
		return null;
	}

	/** A fresh user who creates a business through the API. */
	async function newOwner(): Promise<{ userId: string; businessId: number }> {
		const userId = await createUser();
		const res = await api.post('/business', { name: 'Fresh Boutique' }, userId);
		expect(res.status).toBe(201);
		await settledMembershipOf(userId);
		return { userId, businessId: res.body.business.id };
	}

	/** Makes every COMMIT on the app's pool take a little longer, the way a busy database would. */
	function withSlowCommits(): () => void {
		const pool = getPool();
		const realConnect = pool.connect.bind(pool) as () => Promise<PoolClient>;
		const spy = jest.spyOn(pool, 'connect').mockImplementation((async () => {
			const client = await realConnect();
			const realQuery = client.query.bind(client);
			const realRelease = client.release.bind(client);
			(client as any).query = async (...args: any[]) => {
				if (args[0] === 'COMMIT') await new Promise((r) => setTimeout(r, 300));
				return realQuery(...args);
			};
			(client as any).release = (...args: any[]) => {
				(client as any).query = realQuery;
				(client as any).release = realRelease;
				return realRelease(...args);
			};
			return client;
		}) as any);
		return () => spy.mockRestore();
	}

	async function invite(businessId: number, role: 'owner' | 'staff', as: string): Promise<{ code: string; id: number }> {
		const res = await api.post(`/business/${businessId}/invites`, { role }, as);
		expect(res.status).toBe(201);
		return { code: res.body.code, id: res.body.invite.id };
	}

	const redeem = (code: string, as: string) => api.post('/business/invites/redeem', { code }, as);

	it('a user without a business can create one and becomes its owner with an empty wardrobe', async () => {
		const { userId, businessId } = await newOwner();
		expect(await membershipOf(userId)).toEqual({ business_id_fk: businessId, role: 'owner' });

		const mine = await api.get('/business/mine', userId);
		expect(mine.status).toBe(200);
		expect(mine.body).toMatchObject({ role: 'owner', business: { id: businessId, ownerUserIdFk: userId } });
		expect((await api.get('/user/dresses', userId)).body).toEqual([]);
	});

	it('a member of a business cannot create a second one', async () => {
		expect((await api.post('/business', { name: 'Side hustle' }, GRACE)).status).toBe(409);
		expect((await api.post('/business', { name: 'Second shop' }, ELENA)).status).toBe(409);
	});

	it('a customer-only account has no business', async () => {
		const res = await api.get('/business/mine', OLIVIA);
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ business: null, role: null });
	});

	it('an invite code can be redeemed exactly once, granting the invited role', async () => {
		const { userId: owner, businessId } = await newOwner();
		const { code } = await invite(businessId, 'staff', owner);

		const first = await createUser();
		const ok = await redeem(code, first);
		expect(ok.status).toBe(200);
		expect(ok.body.role).toBe('staff');
		expect(await settledMembershipOf(first)).toEqual({ business_id_fk: businessId, role: 'staff' });
		expect((await api.get('/user/dresses', first)).status).toBe(200);

		const second = await createUser();
		const again = await redeem(code, second);
		expect(again.status).toBeGreaterThanOrEqual(400);
		expect(again.status).toBeLessThan(500);
		expect(await membershipOf(second)).toBeNull();
	});

	it('accepts an invite code typed in lowercase', async () => {
		const { userId: owner, businessId } = await newOwner();
		const { code } = await invite(businessId, 'staff', owner);
		const user = await createUser();
		expect((await redeem(code.toLowerCase(), user)).status).toBe(200);
	});

	it('a revoked invite cannot be redeemed', async () => {
		const { userId: owner, businessId } = await newOwner();
		const { code, id } = await invite(businessId, 'staff', owner);
		expect((await api.delete(`/business/${businessId}/invites/${id}`, owner)).status).toBe(200);

		const user = await createUser();
		const res = await redeem(code, user);
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.status).toBeLessThan(500);
		expect(await membershipOf(user)).toBeNull();
	});

	it('staff cannot create invites or change settings; the owner can, and settings are merged', async () => {
		const { userId: owner, businessId } = await newOwner();
		const { code } = await invite(businessId, 'staff', owner);
		const staff = await createUser();
		await redeem(code, staff);
		await settledMembershipOf(staff);

		expect((await api.post(`/business/${businessId}/invites`, { role: 'staff' }, staff)).status).toBe(403);
		expect((await api.patch('/user/settings', { cleaningBufferDays: 5 }, staff)).status).toBe(403);

		expect((await api.patch('/user/settings', { deliveryOption: 'postal' }, owner)).status).toBe(200);
		expect((await api.patch('/user/settings', { cleaningBufferDays: 3 }, owner)).status).toBe(200);
		const [row] = await sql('SELECT business_settings FROM business WHERE id = $1', [businessId]);
		expect(row.business_settings).toEqual({ deliveryOption: 'postal', cleaningBufferDays: 3 });
	});

	it('the founding owner cannot be removed, even by a co-owner', async () => {
		const { userId: founder, businessId } = await newOwner();
		const { code } = await invite(businessId, 'owner', founder);
		const coOwner = await createUser();
		expect((await redeem(code, coOwner)).body.role).toBe('owner');
		await settledMembershipOf(coOwner);

		const res = await api.delete(`/business/${businessId}/members/${founder}`, coOwner);
		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.status).toBeLessThan(500);
		expect(await membershipOf(founder)).toEqual({ business_id_fk: businessId, role: 'owner' });
		expect((await api.get('/user/dresses', founder)).status).toBe(200);
	});

	it('an owner can remove staff, who then lose access to the wardrobe', async () => {
		const { userId: owner, businessId } = await newOwner();
		const { code } = await invite(businessId, 'staff', owner);
		const staff = await createUser();
		await redeem(code, staff);
		await settledMembershipOf(staff);

		expect((await api.delete(`/business/${businessId}/members/${staff}`, owner)).status).toBe(200);
		expect(await membershipOf(staff)).toBeNull();
		expect((await api.get('/user/dresses', staff)).status).toBe(403);
	});

	it("an owner cannot manage another business's members or invites", async () => {
		const [elenaBusiness] = await sql<{ id: number }>('SELECT id FROM business WHERE owner_user_id_fk = $1', [ELENA]);
		expect((await api.get(`/business/${elenaBusiness.id}/members`, HANNAH)).status).toBe(403);
		expect((await api.get(`/business/${elenaBusiness.id}/invites`, HANNAH)).status).toBe(403);
		expect((await api.post(`/business/${elenaBusiness.id}/invites`, { role: 'owner' }, HANNAH)).status).toBe(403);
		expect((await api.delete(`/business/${elenaBusiness.id}/members/${GRACE}`, HANNAH)).status).toBe(403);
		expect(await membershipOf(GRACE)).toEqual({ business_id_fk: elenaBusiness.id, role: 'staff' });
	});

	it('creating a business has committed by the time it answers 201', async () => {
		const restore = withSlowCommits();
		try {
			const founder = await createUser();
			const created = await api.post('/business', { name: 'Committed Boutique' }, founder);
			expect(created.status).toBe(201);
			// The very next request must see the business it was just told exists.
			expect(await membershipOf(founder)).toEqual({ business_id_fk: created.body.business.id, role: 'owner' });
		} finally {
			restore();
			// Let the delayed COMMIT land before the next test.
			await new Promise((r) => setTimeout(r, 400));
		}
	});

	it('redeeming an invite has committed the membership by the time it answers 200', async () => {
		const { userId: owner, businessId } = await newOwner();
		const { code } = await invite(businessId, 'staff', owner);
		const restoreAgain = withSlowCommits();
		try {
			const joiner = await createUser();
			const redeemed = await redeem(code, joiner);
			expect(redeemed.status).toBe(200);
			expect(await membershipOf(joiner)).toEqual({ business_id_fk: businessId, role: 'staff' });
		} finally {
			restoreAgain();
			await new Promise((r) => setTimeout(r, 400));
		}
	});
});
