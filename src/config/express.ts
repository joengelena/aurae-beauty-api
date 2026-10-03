import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import logger from './logger';
import { getPool } from './db';
import { rootUrl } from '../app/routes/base.routes';
import usersRoutes from '../app/routes/user.routes';
import cookieParser from 'cookie-parser';
import userAuthRoutes from '../app/routes/userAuth.routes';
import dressRoutes from '../app/routes/dress.routes';
import businessRoutes from '../app/routes/business.routes';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import AppError from '../app/utils/errors/appError';
import requireClientType from '../app/middlewares/requireClientType';
import { FILE_VALIDATION_CONFIG } from '../app/utils/cloudflare/validation';

// Never let credentials or tokens reach the log files. The error handler logs
// the request body to help debug failed requests, but signin/signup bodies
// carry a plaintext password — logging those would persist them to
// logs/app.log and logs/error.log. See .claude/rules/logging.md.
const SENSITIVE_BODY_FIELDS = [
	'password',
	'currentPassword',
	'newPassword',
	'confirmPassword',
	'accessToken',
	'refreshToken',
	'token',
];

const redactSensitiveFields = (body: unknown): unknown => {
	if (!body || typeof body !== 'object' || Array.isArray(body)) return body;

	const redacted: Record<string, unknown> = {
		...(body as Record<string, unknown>),
	};
	for (const field of SENSITIVE_BODY_FIELDS) {
		if (field in redacted) redacted[field] = '[REDACTED]';
	}
	return redacted;
};

const MULTER_ERROR_MESSAGES: Partial<Record<multer.ErrorCode, string>> = {
	LIMIT_FILE_SIZE: `File is too large. Maximum size: ${
		FILE_VALIDATION_CONFIG.MAX_FILE_SIZE / (1024 * 1024)
	}MB`,
	LIMIT_FILE_COUNT: 'Too many files uploaded.',
	LIMIT_UNEXPECTED_FILE: 'Too many files, or an unexpected file field.',
	LIMIT_FIELD_COUNT: 'Too many form fields.',
	LIMIT_FIELD_VALUE: 'A form field is too large.',
	LIMIT_FIELD_KEY: 'A form field name is too long.',
	LIMIT_PART_COUNT: 'Too many form parts.',
};

/**
 * Decides what the client sees for an error. Only messages we wrote ourselves
 * (AppError), multer limit errors and 4xx errors flagged safe to expose by
 * http-errors (e.g. body-parser's malformed JSON) are passed through. Anything
 * else, such as a raw Postgres error, becomes a generic 500. The real message
 * is still logged.
 */
const toClientError = (err: any): { status: number; message: string } => {
	if (err instanceof AppError) {
		return {
			status: err.status || 500,
			message: err.message || 'Something went wrong. Please try again.',
		};
	}

	if (err instanceof multer.MulterError) {
		return {
			status: 400,
			message: MULTER_ERROR_MESSAGES[err.code] ?? 'Invalid file upload.',
		};
	}

	const httpStatus = err?.status ?? err?.statusCode;
	if (
		err?.expose === true &&
		typeof httpStatus === 'number' &&
		httpStatus >= 400 &&
		httpStatus < 500
	) {
		return {
			status: httpStatus,
			message:
				err.type === 'entity.parse.failed'
					? 'Malformed JSON in request body.'
					: err.type === 'entity.too.large'
					? 'Request body is too large.'
					: 'Invalid request.',
		};
	}

	return {
		status: 500,
		message: 'Something went wrong. Please try again.',
	};
};

export default () => {
	const app = express();

	// Middleware
	// Get allowed origins from environment variable
	const allowedOrigins =
		process.env.ALLOWED_COOKIE_ORIGINS?.split(',').map((o) => o.trim()) ||
		[];

	app.use(
		cors({
			// Allow specific origins from env, or all origins if not configured
			origin: allowedOrigins.length > 0 ? allowedOrigins : true,
			credentials: true,
		}),
	);
	app.use(bodyParser.json());
	app.use(bodyParser.raw({ type: 'text/plain' }));
	app.use(bodyParser.raw({ type: ['image/*'], limit: '5mb' }));
	app.use(cookieParser());

	// Debug
	app.use((req, res, next) => {
		if (req.path !== '/') {
			logger.http(`##### ${req.method} ${req.path} #####`);
		}
		next();
	});

	app.get(rootUrl + '/health', async (req, res) => {
		try {
			const pool = getPool();
			await pool.query('SELECT 1');

			res.status(200).send({
				status: 'healthy',
				api: 'running',
				database: 'connected',
				timestamp: new Date().toISOString(),
			});
		} catch (error: any) {
			logger.error(`Health check failed: ${error.message}`);
			res.status(503).send({
				status: 'unhealthy',
				api: 'running',
				database: 'disconnected',
				error: 'Database connection failed',
				timestamp: new Date().toISOString(),
			});
		}
	});

	// CSRF guard: state-changing /api/v1 requests must carry x-client-type.
	// Mounted after cors() so preflight OPTIONS requests are answered first.
	app.use(rootUrl, requireClientType);

	// Routes
	usersRoutes(app);
	userAuthRoutes(app);
	dressRoutes(app);
	businessRoutes(app);

	app.use((err: any, req: Request, res: Response, next: NextFunction) => {
		const { status, message } = toClientError(err);

		logger.error({
			message: err?.message,
			status,
			stack: err?.stack,
			method: req.method,
			path: req.originalUrl,
			body: redactSensitiveFields(req.body),
		});

		if (res.headersSent) {
			next(err);
			return;
		}

		res.status(status).send({ message });
	});

	return app;
};
