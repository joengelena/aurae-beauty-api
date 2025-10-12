import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import logger from './logger';
import usersRoutes from '../app/routes/user.routes';
import cookieParser from 'cookie-parser';
import listingRoutes from '../app/routes/listing.routes';
import userAuthRoutes from '../app/routes/userAuth.routes';
import { Request, Response, NextFunction } from 'express';

export default () => {
	const app = express();

	// Middleware
	app.use(
		cors({
			// Allow any origin, should set to website domain in prod
			origin: true,
			credentials: true,
		})
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

	app.get('/heartbeat', (req, res) => {
		res.send({ message: "I'm alive!" });
	});

	// Routes
	usersRoutes(app);
	listingRoutes(app);
	userAuthRoutes(app);

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
