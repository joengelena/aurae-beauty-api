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
import { CACHE_PRESETS } from '../middlewares/cacheControl';

const listingRoutes = (app: Express) => {
	// Static data - cache for 24 hours
	app.route(rootUrl + '/listings/attributes').get(
		CACHE_PRESETS.staticCache,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		},
		asyncHandler(getListingAttributes)
	);

	// Listings list - cache for 5 minutes (frequently updated)
	app.route(rootUrl + '/listings')
		.get(
			CACHE_PRESETS.shortCache,
			optionalSupabaseAuth,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOptional);
			},
			asyncHandler(getAllListings)
		)
		.post(
			// Order matters when uploading images
			uploadMulter.array('images', 10),
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.postListing);
			},
			asyncHandler(postListing)
		);

	// Individual listing - cache for 5 minutes
	app.route(rootUrl + '/listings/:id')
		.get(
			CACHE_PRESETS.shortCache,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.emptyBody);
			},
			asyncHandler(getListing)
		)
		.patch(
			// Allow updating multiple images (up to 10)
			uploadMulter.array('images', 10),
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

	app.route(rootUrl + '/listings/:id/view').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.emptyBody);
	}, asyncHandler(incrementViewCount));
};

export default listingRoutes;
