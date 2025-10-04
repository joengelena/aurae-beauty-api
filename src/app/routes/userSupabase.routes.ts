import { Express } from 'express';
import { rootUrl } from './base.routes';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import { asyncHandler } from '../utils/asyncHandler';
import supabaseAuth from '../middlewares/supabaseAuth';

// Supabase Auth Controllers
import signUpUserSupabase from '../controllers/userController/signUpUserSupabase';
import signInUserSupabase from '../controllers/userController/signInUserSupabase';
import signOutUserSupabase from '../controllers/userController/signOutUserSupabase';

/**
 * V2 User Routes using Supabase Authentication
 * These routes run in parallel with existing v1 routes for testing
 */
const userSupabaseRoutes = (app: Express) => {
	// Public routes
	app.route(rootUrl + '/v2/user/signup').post(
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.signUpUser);
		},
		asyncHandler(signUpUserSupabase)
	);

	app.route(rootUrl + '/v2/user/signin').post(
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.signInUser);
		},
		asyncHandler(signInUserSupabase)
	);

	// Private routes (require Supabase JWT)
	app.route(rootUrl + '/v2/user/signout').post(
		supabaseAuth,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		asyncHandler(signOutUserSupabase)
	);
};

export default userSupabaseRoutes;