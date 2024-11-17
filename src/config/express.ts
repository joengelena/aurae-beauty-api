import express from 'express';
import bodyParser from 'body-parser';
import allowCrossOriginRequestsMiddleware from '../app/middlewares/cors';
import logger from './logger';
import usersRoutes from '../app/routes/user.routes';

export default () => {
	const app = express();

	// Middleware
	app.use(allowCrossOriginRequestsMiddleware);
	app.use(bodyParser.json());
	app.use(bodyParser.raw({ type: 'text/plain' }));
	app.use(bodyParser.raw({ type: ['image/*'], limit: '5mb' }));

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

	return app;
};
