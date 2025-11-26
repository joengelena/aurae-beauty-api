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
	incrementViewCount,
} from '../controllers/listingController';
import uploadMulter from '../utils/multerStorage';
import supabaseAuthenticateReq from '../middlewares/supabaseAuthenticateReq';
import { asyncHandler } from '../utils/asyncHandler';
import optionalSupabaseAuth from '../middlewares/optionalSupabaseAuth';

const listingRoutes = (app: Express) => {
	app.route(rootUrl + '/listings/attributes').get((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.emptyBody);
	}, asyncHandler(getListingAttributes));

	app.route(rootUrl + '/listings')
		.get((req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		}, asyncHandler(getAllListings))
		.post(
			// Order matters when uploading images
			uploadMulter.array('images', 10),
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.postListing);
			},
			asyncHandler(postListing)
		);

	app.route(rootUrl + '/listings/:id')
		.get((req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		}, asyncHandler(getListing))
		.patch(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.updateListing);
			},
			asyncHandler(updateLising)
		)
		.delete(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(deleteListing)
		);

	app.route(rootUrl + '/listings/:id/view')
		.post((req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		}, asyncHandler(incrementViewCount));
};

export default listingRoutes;
