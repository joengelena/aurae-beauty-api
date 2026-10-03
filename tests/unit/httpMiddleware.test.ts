import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import requireClientType from '../../src/app/middlewares/requireClientType';

// The Express app is built for real here (no DB connection is opened), so the
// external services it imports are mocked out.
jest.mock('../../src/config/supabase', () => require('../helpers/mocks/supabaseMock').createSupabaseMock());
jest.mock('../../src/app/utils/cloudflare/r2Client', () => require('../helpers/mocks/r2Mock').createR2ClientMock());

import createApp from '../../src/config/express';
import logger from '../../src/config/logger';
import { supabaseAuth } from '../../src/config/supabase';

describe('requireClientType (CSRF guard)', () => {
	function run(method: string, headers: Record<string, unknown> = {}) {
		const req = { method, headers, path: '/x', originalUrl: '/api/v1/x', ip: '127.0.0.1' } as unknown as Request;
		const send = jest.fn();
		const res = { status: jest.fn().mockReturnValue({ send }) } as unknown as Response;
		const next = jest.fn();
		requireClientType(req, res, next as unknown as NextFunction);
		return { next, status: (res.status as jest.Mock).mock.calls[0]?.[0] as number | undefined };
	}

	it('lets read-only methods through without the header', () => {
		for (const method of ['GET', 'HEAD', 'OPTIONS']) {
			const { next, status } = run(method);
			expect(next).toHaveBeenCalled();
			expect(status).toBeUndefined();
		}
	});

	it('rejects every state-changing method without x-client-type with a 403', () => {
		for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
			const { next, status } = run(method);
			expect({ method, called: next.mock.calls.length, status }).toEqual({ method, called: 0, status: 403 });
		}
	});

	it('accepts x-client-type web and flutter', () => {
		expect(run('POST', { 'x-client-type': 'flutter' }).next).toHaveBeenCalled();
		expect(run('PATCH', { 'x-client-type': 'web' }).next).toHaveBeenCalled();
	});

	it('rejects unknown, empty or repeated x-client-type values', () => {
		for (const clientType of ['', 'evil', 'FLUTTER ', ['flutter', 'web']]) {
			const { next, status } = run('DELETE', { 'x-client-type': clientType });
			expect({ clientType, called: next.mock.calls.length, status }).toEqual({ clientType, called: 0, status: 403 });
		}
	});
});

describe('global error handler', () => {
	const app = createApp();

	it('returns a generic 500 for an unexpected error and redacts credentials from the logged body', async () => {
		const errorSpy = jest.spyOn(logger, 'error');
		(supabaseAuth.auth.signInWithPassword as jest.Mock).mockRejectedValueOnce(
			new Error('connect ECONNREFUSED 10.0.0.5:5432 password authentication failed for user "postgres"')
		);

		const res = await request(app)
			.post('/api/v1/user/signin')
			.set('x-client-type', 'flutter')
			.send({ email: 'olivia.brown@example.com', password: 'hunter2-SECRET' });

		expect(res.status).toBe(500);
		expect(res.body).toEqual({ message: expect.any(String) });
		expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|postgres|hunter2/);

		// The handler logs the request body to help debugging — never the password.
		const handlerLog = errorSpy.mock.calls
			.map((call) => call[0] as any)
			.find((arg) => arg && typeof arg === 'object' && 'body' in arg);
		expect(handlerLog).toBeDefined();
		expect(handlerLog.body.password).toBe('[REDACTED]');
		expect(handlerLog.body.email).toBe('olivia.brown@example.com');

		const everythingLogged = JSON.stringify(errorSpy.mock.calls);
		expect(everythingLogged).not.toContain('hunter2-SECRET');
	});

	it('answers malformed JSON with a 400, not a 500', async () => {
		const res = await request(app)
			.post('/api/v1/user/signin')
			.set('x-client-type', 'flutter')
			.set('Content-Type', 'application/json')
			.send('{"email": "a@b.c", "password": ');
		expect(res.status).toBe(400);
		expect(res.body.message).toMatch(/json/i);
	});

	it('rejects a state-changing request without x-client-type before any route runs', async () => {
		const res = await request(app).post('/api/v1/user/signin').send({ email: 'a@b.co', password: 'x' });
		expect(res.status).toBe(403);
		expect(supabaseAuth.auth.signInWithPassword).not.toHaveBeenCalled();
	});
});
