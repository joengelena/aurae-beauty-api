import { Express } from 'express';
import { rootUrl } from './base.routes';
import { getListingFilters } from '../controllers/listingController';
import ajvSchema from '../resources/ajvSchema.json';
import validateRequestBody from '../middlewares/validateRequestBody';

const listingRoutes = (app: Express) => {
	app.route(rootUrl + '/listing/filters').get((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.emptyBody);
	}, getListingFilters);
};

export default listingRoutes;
