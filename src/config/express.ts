import express from 'express';
import bodyParser from 'body-parser';
import allowCrossOriginRequestsMiddleware from '../app/middlewares/cors';
import logger from './logger';
import usersRoutes from '../app/routes/user.routes';
import cookieParser from 'cookie-parser';
import listingRoutes from '../app/routes/listing.routes';
import cloundinaryRoutes from '../app/routes/cloundinary.routes';

export default () => {
	const app = express();

	// Middleware
	app.use(allowCrossOriginRequestsMiddleware);
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
	cloundinaryRoutes(app);

	return app;
};
