import { Request, Response, NextFunction } from 'express';
import logger from '../../config/logger';

/**
 * CSRF guard for cookie-authenticated requests.
 *
 * Production auth cookies are SameSite=None, so a third-party page could make
 * the browser send them. A plain HTML form (including multipart) can never set
 * a custom header, and a cross-origin fetch that sets one triggers a CORS
 * preflight that only the origins in ALLOWED_COOKIE_ORIGINS pass. Requiring
 * `x-client-type` on every state-changing request therefore blocks forged
 * requests while costing first-party clients nothing: the Flutter ApiClient
 * already sends it on every call (web and native).
 *
 * Exemptions: none. Every POST/PUT/PATCH/DELETE route under /api/v1 is called
 * only through the Flutter ApiClient. Supabase email links (verification,
 * password reset) land on the frontend, not on this API, and there are no
 * webhooks. If a webhook or other header-less caller is ever added, list its
 * exact path in EXEMPT_PATHS.
 */
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ALLOWED_CLIENT_TYPES = new Set(['web', 'flutter']);
const EXEMPT_PATHS = new Set<string>([]);

function requireClientType(req: Request, res: Response, next: NextFunction): void {
	if (!STATE_CHANGING_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) {
		next();
		return;
	}

	const clientType = req.headers['x-client-type'];

	if (typeof clientType !== 'string' || !ALLOWED_CLIENT_TYPES.has(clientType)) {
		logger.warn(
			`Rejected ${req.method} ${req.originalUrl}: missing or invalid x-client-type header (ip ${req.ip})`
		);
		res.status(403).send({
			message: 'Forbidden: missing or invalid client type header',
		});
		return;
	}

	next();
}

export default requireClientType;
