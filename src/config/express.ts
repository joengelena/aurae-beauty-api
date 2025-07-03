import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import logger from './logger';
import usersRoutes from '../app/routes/user.routes';
import cookieParser from 'cookie-parser';
import listingRoutes from '../app/routes/listing.routes';

export default () => {
	const app = express();

	// Middleware
	app.use(
		cors({
			origin: 'http://localhost:53544',
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

	// ROUTES
	usersRoutes(app);
	listingRoutes(app);

	return app;
};
