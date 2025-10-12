import { Express } from 'express';
import { rootUrl } from './base.routes';
import ajvSchema from '../resources/ajvSchema.json';
import validateRequestBody from '../middlewares/validateRequestBody';
import {
	getListingAttributes,
	getAllListings,
	postListing,
	getListing,
	updateLising,
	deleteListing,
} from '../controllers/listingController';
import uploadMulter from '../utils/multerStorage';
import supabaseAuthenticateReq from '../middlewares/supabaseAuthenticateReq';

const listingRoutes = (app: Express) => {
	app.route(rootUrl + '/listings/attributes').get((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.emptyBody);
	}, getListingAttributes);

	app.route(rootUrl + '/listings')
		.get((req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		}, getAllListings)
		.post(
			// Order matters when uploading images
			uploadMulter.array('images', 10),
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.postListing);
			},
			postListing
		);

	app.route(rootUrl + '/listings/:id')
		.get((req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		}, getListing)
		.patch(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.updateListing);
			},
			updateLising
		)
		.delete(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			deleteListing
		);
};

export default listingRoutes;
