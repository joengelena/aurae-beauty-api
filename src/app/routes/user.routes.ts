import { Express } from 'express';
import { rootUrl } from './base.routes';
import {
	signUpUser,
	signInUser,
	signOutUser,
	viewUser,
	updateUser,
	updatePasswordUser,
} from '../controllers/userController';
import validateRequest from '../middlewares/requestAuthentication/validateRequest';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import sendEmailValidation from '../controllers/userController/sendEmailValidation';

const usersRoutes = (app: Express) => {
	// Publics routes
	app.route(rootUrl + '/users/signup').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.signUpUser);
	}, signUpUser);

	app.route(rootUrl + '/users/signin').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.signInUser);
	}, signInUser);

	// Privates routes
	app.route(rootUrl + '/users/signout').post(
		validateRequest,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.signOutUser);
		},
		signOutUser
	);

	app.route(rootUrl + '/users/:id')
		.get(validateRequest, viewUser)
		.patch(
			validateRequest,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.updateUser);
			},
			updateUser
		);

	app.route(rootUrl + '/users/:id/update-password').patch(
		validateRequest,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.updateUserPassword);
		},
		updatePasswordUser
	);

	app.route(rootUrl + '/users/:id/send-email-verification-link').post(
		validateRequest,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		},
		sendEmailValidation
	);
};

export default usersRoutes;
