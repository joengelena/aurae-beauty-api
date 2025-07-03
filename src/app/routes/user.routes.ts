import { Express } from 'express';
import { rootUrl } from './base.routes';
import {
	signUpUser,
	signInUser,
	signOutUser,
	viewUser,
	updateUser,
	updatePasswordUser,
	forgotPassword,
	sendEmailValidation,
	validateEmailVerificationToken,
	deleteUser,
	resetPassword,
} from '../controllers/userController';
import validateRequest from '../middlewares/requestAuthentication/validateRequest';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import { asyncHandler } from '../utils/asyncHandler';

const usersRoutes = (app: Express) => {
	// Publics routes
	app.route(rootUrl + '/user/signup').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.signUpUser);
	}, asyncHandler(signUpUser));

	app.route(rootUrl + '/user/signin').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.signInUser);
	}, signInUser);

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
	app.route(rootUrl + '/user/signout').post(
		validateRequest,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		signOutUser
	);

	app.route(rootUrl + '/user')
		.delete(
			validateRequest,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.deleteUser);
			},
			deleteUser
		)
		.patch(
			validateRequest,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.updateUser);
			},
			updateUser
		);

	app.route(rootUrl + '/user/update-password').patch(
		validateRequest,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.updateUserPassword);
		},
		updatePasswordUser
	);

	app.route(rootUrl + '/user/send-email-verification-link').post(
		validateRequest,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		sendEmailValidation
	);
};

export default usersRoutes;
