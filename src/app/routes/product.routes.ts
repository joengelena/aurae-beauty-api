import { Express } from 'express';
import { rootUrl } from './base.routes';
import validateRequest from '../middlewares/requestAuthentication/validateRequest';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';

const productRoutes = (app: Express) => {
	app.route(rootUrl + '/products')
		.get((req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		})
		.post(validateRequest, (req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		});

	app.route(rootUrl + '/products/:id')
		.get((req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		})
		.patch(validateRequest, (req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		})
		.delete(validateRequest, (req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		});
};

export default productRoutes;
