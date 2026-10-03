import { Express } from 'express';
import request, { Test } from 'supertest';
import createApp from '../../src/config/express';
import { connect, getPool } from '../../src/config/db';
import { closeTestDb } from './db';
import { tokenFor } from './mocks/supabaseMock';
import { resetR2Calls } from './mocks/r2Mock';

export const API = '/api/v1';

type Options = { clientType?: string | null };

function decorate(req: Test, as: string | null | undefined, opts: Options, stateChanging: boolean): Test {
	if (as) req.set('Authorization', `Bearer ${tokenFor(as)}`);
	const clientType = opts.clientType === undefined ? (stateChanging ? 'flutter' : null) : opts.clientType;
	if (clientType) req.set('x-client-type', clientType);
	return req;
}

export type Api = ReturnType<typeof makeApi>;

function makeApi(app: Express) {
	return {
		app,
		get: (path: string, as?: string | null, opts: Options = {}) =>
			decorate(request(app).get(API + path), as, opts, false),
		post: (path: string, body: object = {}, as?: string | null, opts: Options = {}) =>
			decorate(request(app).post(API + path), as, opts, true).send(body),
		patch: (path: string, body: object = {}, as?: string | null, opts: Options = {}) =>
			decorate(request(app).patch(API + path), as, opts, true).send(body),
		delete: (path: string, as?: string | null, opts: Options = {}) =>
			decorate(request(app).delete(API + path), as, opts, true),
		/** Multipart PATCH/POST: returns the raw request so callers can .field()/.attach(). */
		multipart: (method: 'post' | 'patch', path: string, as?: string | null, opts: Options = {}) =>
			decorate(request(app)[method](API + path), as, opts, true),
	};
}

/**
 * Connects the app's pool to shine_test and builds the Express app once per
 * test file. Call at the top level of a describe block.
 */
export function useApi(): Api {
	const holder: { api?: Api } = {};

	beforeAll(async () => {
		await connect();
		holder.api = makeApi(createApp());
	});

	beforeEach(() => resetR2Calls());

	afterAll(async () => {
		await getPool()?.end();
		await closeTestDb();
	});

	return new Proxy({} as Api, {
		get: (_target, prop) => {
			if (!holder.api) throw new Error('useApi() used before beforeAll ran');
			return (holder.api as any)[prop];
		},
	});
}
