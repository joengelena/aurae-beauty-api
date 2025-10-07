import { Express } from 'express';
import { rootUrl } from './base.routes';
import {
	viewUser,
	updateUser,
	updatePasswordUser,
	forgotPassword,
	sendEmailValidation,
	validateEmailVerificationToken,
	deleteUser,
	resetPassword,
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
	}, forgotPassword);

	app.route(rootUrl + '/user/forgot-password/reset-password/:token').post(
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.ResetPassword);
		},
		resetPassword
	);

	app.route(rootUrl + '/user/validate-email-link').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.emptyBody);
	}, validateEmailVerificationToken);

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
			deleteUser
		)
		.patch(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.updateUser);
			},
			updateUser
		);

	app.route(rootUrl + '/user/update-password').patch(
		supabaseAuthenticateReq,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.updateUserPassword);
		},
		updatePasswordUser
	);

	app.route(rootUrl + '/user/send-email-verification-link').post(
		supabaseAuthenticateReq,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		sendEmailValidation
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
