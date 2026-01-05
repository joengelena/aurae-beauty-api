import { Express } from 'express';
import { rootUrl } from './base.routes';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import { asyncHandler } from '../utils/asyncHandler';
import supabaseAuthenticateReq from '../middlewares/supabaseAuthenticateReq';
import {
	signInUserSupabase,
	signUpUserSupabase,
	signOutUserSupabase,
	refreshTokenSupabase,
} from '../controllers/userController';
import { CACHE_PRESETS } from '../middlewares/cacheControl';

const userAuthRoutes = (app: Express) => {
	// Public routes - no caching for auth endpoints
	app.route(rootUrl + '/user/signup').post(
		CACHE_PRESETS.noCache,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.signUpUser);
		},
		asyncHandler(signUpUserSupabase)
	);

	app.route(rootUrl + '/user/signin').post(
		CACHE_PRESETS.noCache,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.signInUser);
		},
		asyncHandler(signInUserSupabase)
	);

	app.route(rootUrl + '/user/refresh-token').post(
		CACHE_PRESETS.noCache,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.refreshToken);
		},
		asyncHandler(refreshTokenSupabase)
	);

	// Private routes - no caching
	app.route(rootUrl + '/user/signout').post(
		CACHE_PRESETS.noCache,
		supabaseAuthenticateReq,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		asyncHandler(signOutUserSupabase)
	);
};

export default userAuthRoutes;
