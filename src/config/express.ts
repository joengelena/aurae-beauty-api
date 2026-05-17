import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import logger from './logger';
import { getPool } from './db';
import { rootUrl } from '../app/routes/base.routes';
import usersRoutes from '../app/routes/user.routes';
import cookieParser from 'cookie-parser';
import listingRoutes from '../app/routes/listing.routes';
import userAuthRoutes from '../app/routes/userAuth.routes';
import dressRoutes from '../app/routes/dress.routes';
import { Request, Response, NextFunction } from 'express';

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

	// Routes
	usersRoutes(app);
	listingRoutes(app);
	userAuthRoutes(app);
	dressRoutes(app);

	app.use((err: any, req: Request, res: Response, next: NextFunction) => {
		logger.error({
			message: err.message,
			status: err.status || 500,
			stack: err.stack,
			method: req.method,
			path: req.originalUrl,
			body: req.body,
		});

		res.status(err.status || 500).send({
			message: err.message || 'Something went very wrong!',
		});
	});

	return app;
};
