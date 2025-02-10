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
} from '../controllers/userController';
import validateRequest from '../middlewares/requestAuthentication/validateRequest';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';

const usersRoutes = (app: Express) => {
	// Publics routes
	app.route(rootUrl + '/user/signup').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.signUpUser);
	}, signUpUser);

	app.route(rootUrl + '/user/signin').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.signInUser);
	}, signInUser);

	app.route(rootUrl + '/user/forgot-password').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.forgotPassword);
	}, forgotPassword);

	app.route(rootUrl + '/user/validate-email-link').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.emptyBody);
	}, validateEmailVerificationToken);

	// Privates routes
	app.route(rootUrl + '/user/signout').post(
		validateRequest,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		signOutUser
	);

	app.route(rootUrl + '/user').get(
		validateRequest,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userIdOnly);
		},
		viewUser
	);

	app.route(rootUrl + '/user/update-user').patch(
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

	app.route(rootUrl + '/user/delete-user').delete(
		validateRequest,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.deleteUser);
		},
		deleteUser
	);
};

export default usersRoutes;
