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
} from '../controllers/userController';

const userAuthRoutes = (app: Express) => {
	// Public routes
	app.route(rootUrl + '/user/signup').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.signUpUser);
	}, asyncHandler(signUpUserSupabase));

	app.route(rootUrl + '/user/signin').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.signInUser);
	}, asyncHandler(signInUserSupabase));

	// Private routes
	app.route(rootUrl + '/user/signout').post(
		supabaseAuthenticateReq,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		asyncHandler(signOutUserSupabase)
	);
};

export default userAuthRoutes;
