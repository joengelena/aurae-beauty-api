import { Express } from 'express';
import { rootUrl } from './base.routes';
import {
	viewUser,
	updateUser,
	deleteUserSupabase,
	changePasswordSupabase,
	forgotPasswordSupabase,
} from '../controllers/userController';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import {
	watchlistAdd,
	watchlistRemove,
} from '../controllers/watchlistController';
import supabaseAuthenticateReq from '../middlewares/supabaseAuthenticateReq';

const usersRoutes = (app: Express) => {
	// Public routes
	app.route(rootUrl + '/user/forgot-password').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.forgotPassword);
	}, forgotPasswordSupabase);

	app.route(rootUrl + '/user/change-password').post(
		supabaseAuthenticateReq,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.ChangePassword);
		},
		changePasswordSupabase
	);

	app.route(rootUrl + '/users/:userId').get((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.emptyBody);
	}, viewUser);

	// Privates routes
	app.route(rootUrl + '/user')
		.delete(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.deleteUser);
			},
			deleteUserSupabase
		)
		.patch(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.updateUser);
			},
			updateUser
		);

	app.route(rootUrl + '/user/watchlist-add/:listingId').post(
		supabaseAuthenticateReq,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		watchlistAdd
	);

	app.route(rootUrl + '/user/watchlist-remove/:listingId').delete(
		supabaseAuthenticateReq,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		watchlistRemove
	);
};

export default usersRoutes;
