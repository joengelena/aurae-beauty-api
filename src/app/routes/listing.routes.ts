import { Express } from 'express';
import { rootUrl } from './base.routes';
import ajvSchema from '../resources/ajvSchema.json';
import validateRequestBody from '../middlewares/validateRequestBody';
import {
	getListingFilters,
	getAllListings,
	postListing,
	getListing,
	updateLising,
	deleteListing,
} from '../controllers/listingController';
import validateRequest from '../middlewares/requestAuthentication/validateRequest';

const listingRoutes = (app: Express) => {
	app.route(rootUrl + '/listings/filters').get((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.emptyBody);
	}, getListingFilters);

	app.route(rootUrl + '/listings')
		.get((req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		}, getAllListings)
		.post(
			validateRequest,
			(req, res, next) => {
				validateRequestBody(
					req,
					res,
					next,
					ajvSchema.postVehicleListing
				);
			},
			postListing
		);

	app.route(rootUrl + '/listings/:id')
		.get((req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		}, getListing)
		.patch(
			validateRequest,
			(req, res, next) => {
				validateRequestBody(
					req,
					res,
					next,
					ajvSchema.updateVehicleListing
				);
			},
			updateLising
		)
		.delete(
			validateRequest,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			deleteListing
		);
};

export default listingRoutes;
