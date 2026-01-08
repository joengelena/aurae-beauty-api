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

const userAuthRoutes = (app: Express) => {
	app.route(rootUrl + '/user/signup').post(
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.signUpUser);
		},
		asyncHandler(signUpUserSupabase)
	);

	app.route(rootUrl + '/user/signin').post(
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.signInUser);
		},
		asyncHandler(signInUserSupabase)
	);

	app.route(rootUrl + '/user/refresh-token').post(
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.refreshToken);
		},
		asyncHandler(refreshTokenSupabase)
	);

	app.route(rootUrl + '/user/signout').post(
		supabaseAuthenticateReq,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		asyncHandler(signOutUserSupabase)
	);
};

export default userAuthRoutes;
