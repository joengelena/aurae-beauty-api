import { Express } from 'express';
import { rootUrl } from './base.routes';
import {
	viewUser,
	updateUser,
	deleteUserSupabase,
	changePasswordSupabase,
	resetPasswordSupabase,
	forgotPasswordSupabase,
} from '../controllers/userController';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import {
	watchlistAdd,
	watchlistRemove,
	watchlistGet,
} from '../controllers/watchlistController';
import supabaseAuthenticateReq from '../middlewares/supabaseAuthenticateReq';
import { asyncHandler } from '../utils/asyncHandler';
import { CACHE_PRESETS } from '../middlewares/cacheControl';

const usersRoutes = (app: Express) => {
	// Public routes - no caching for password operations
	app.route(rootUrl + '/user/forgot-password').post(
		CACHE_PRESETS.noCache,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.forgotPassword);
		},
		asyncHandler(forgotPasswordSupabase)
	);

	app.route(rootUrl + '/user/reset-password').post(
		CACHE_PRESETS.noCache,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.resetPassword);
		},
		asyncHandler(resetPasswordSupabase)
	);

	app.route(rootUrl + '/user/change-password').post(
		CACHE_PRESETS.noCache,
		supabaseAuthenticateReq,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.ChangePassword);
		},
		asyncHandler(changePasswordSupabase)
	);

	// Public user profile - cache for 5 minutes
	app.route(rootUrl + '/users/:userId').get(
		CACHE_PRESETS.shortCache,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		},
		asyncHandler(viewUser)
	);

	// Privates routes
	app.route(rootUrl + '/user')
		.delete(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.deleteUser);
			},
			asyncHandler(deleteUserSupabase)
		)
		.patch(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.updateUser);
			},
			asyncHandler(updateUser)
		);

	// Watchlist - no caching for user-specific data
	app.route(rootUrl + '/user/watchlist').get(
		CACHE_PRESETS.noCache,
		supabaseAuthenticateReq,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		watchlistGet
	);

	app.route(rootUrl + '/user/watchlist-add/:listingId').post(
		supabaseAuthenticateReq,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		asyncHandler(watchlistAdd)
	);

	app.route(rootUrl + '/user/watchlist-remove/:listingId').delete(
		supabaseAuthenticateReq,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		asyncHandler(watchlistRemove)
	);
};

export default usersRoutes;
