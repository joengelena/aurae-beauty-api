import multer from 'multer';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { FILE_VALIDATION_CONFIG } from './cloudflare/validation';

const storage = multer.memoryStorage();

// Memory storage buffers every file in RAM, so the limits are enforced while
// streaming rather than after the fact. Oversized or excess files are rejected
// with a MulterError, which the global error handler maps to a 400.
// Per-route maximums (5 incident photos, 1 profile image) are enforced by the
// maxCount passed to .array() / .single().
const multerUpload = multer({
	storage,
	limits: {
		fileSize: FILE_VALIDATION_CONFIG.MAX_FILE_SIZE,
		files: FILE_VALIDATION_CONFIG.MAX_FILES,
		fields: 50,
		fieldSize: 1024 * 1024,
	},
});

/**
 * Wraps a multer middleware for use AFTER supabaseAuthenticateReq.
 *
 * Auth must run first so unauthenticated callers can't make the server buffer
 * uploads. But multer replaces req.body with the parsed form fields, wiping the
 * currentUserId the auth middleware injected. This wrapper runs multer and then
 * re-injects the verified id from res.locals, overwriting any client-sent
 * currentUserId form field.
 */
export function authenticatedUpload(upload: RequestHandler): RequestHandler {
	return (req: Request, res: Response, next: NextFunction) => {
		upload(req, res, (err?: unknown) => {
			if (err) {
				next(err);
				return;
			}

			if (!req.body) {
				req.body = {};
			}
			req.body.currentUserId = res.locals.currentUserId;
			next();
		});
	};
}

export default multerUpload;
