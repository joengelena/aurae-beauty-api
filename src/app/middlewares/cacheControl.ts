import { Request, Response, NextFunction } from 'express';

/**
 * Cache control middleware options
 */
interface ICacheControlOptions {
	/**
	 * Cache duration in seconds
	 * Set to 0 for no-cache
	 */
	maxAge?: number;
	/**
	 * Whether the response can be cached by shared caches (CDNs, proxies)
	 * - 'public': Can be cached by any cache
	 * - 'private': Can only be cached by the browser
	 * - 'no-cache': Must revalidate with server before using cached version
	 */
	type?: 'public' | 'private' | 'no-cache';
	/**
	 * Whether the response can be cached at all
	 * If true, sets 'no-store' which prevents any caching
	 */
	noStore?: boolean;
	/**
	 * Whether cache must revalidate when stale
	 */
	mustRevalidate?: boolean;
}

/**
 * Middleware factory that sets Cache-Control headers
 *
 * @example
 * // No caching (for auth endpoints, user-specific data)
 * app.get('/user/profile', cacheControl({ noStore: true }), handler);
 *
 * @example
 * // Cache for 5 minutes, private (browser only)
 * app.get('/listings', cacheControl({ maxAge: 300, type: 'private' }), handler);
 *
 * @example
 * // Cache for 1 hour, public (can be cached by CDNs)
 * app.get('/listings/attributes', cacheControl({ maxAge: 3600, type: 'public' }), handler);
 */
export const cacheControl = (options: ICacheControlOptions = {}) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const {
			maxAge = 0,
			type = 'private',
			noStore = false,
			mustRevalidate = false,
		} = options;

		const directives: string[] = [];

		// No store - don't cache at all
		if (noStore) {
			directives.push('no-store', 'no-cache', 'must-revalidate');
			directives.push('max-age=0');
		} else {
			// Cache type (public/private/no-cache)
			directives.push(type);

			// Max age
			directives.push(`max-age=${maxAge}`);

			// Must revalidate
			if (mustRevalidate) {
				directives.push('must-revalidate');
			}
		}

		// Set the Cache-Control header
		res.setHeader('Cache-Control', directives.join(', '));

		// Also set Vary header to ensure proper caching based on auth
		if (req.headers.authorization || req.cookies) {
			res.setHeader('Vary', 'Authorization, Cookie');
		}

		next();
	};
};

/**
 * Preset cache control configurations for common use cases
 */
export const CACHE_PRESETS = {
	/**
	 * No caching - for auth endpoints, mutations, user-specific data
	 * Cache-Control: no-store, no-cache, must-revalidate, max-age=0
	 */
	noCache: cacheControl({ noStore: true }),

	/**
	 * Short cache (5 minutes) - for frequently updated data
	 * Cache-Control: private, max-age=300
	 */
	shortCache: cacheControl({ maxAge: 300, type: 'private' }),

	/**
	 * Medium cache (30 minutes) - for moderately updated data
	 * Cache-Control: private, max-age=1800
	 */
	mediumCache: cacheControl({ maxAge: 1800, type: 'private' }),

	/**
	 * Long cache (1 hour) - for rarely updated data
	 * Cache-Control: public, max-age=3600
	 */
	longCache: cacheControl({ maxAge: 3600, type: 'public' }),

	/**
	 * Very long cache (24 hours) - for static data like attributes, brands
	 * Cache-Control: public, max-age=86400
	 */
	staticCache: cacheControl({ maxAge: 86400, type: 'public' }),
};

export default cacheControl;
