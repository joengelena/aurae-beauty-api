import { Express } from 'express';
import { rootUrl } from './base.routes';
import {
	signUpUser,
	signInUser,
	signOutUser,
} from '../controllers/userController';
import validateRequest from '../middlewares/requestAuthentication/validateRequest';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';

const usersRoutes = (app: Express) => {
	app.route(rootUrl + '/users/signup').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.userSignUp);
	}, signUpUser);

	app.route(rootUrl + '/users/signin').post((req, res, next) => {
		validateRequestBody(req, res, next, ajvSchema.userSignIn);
	}, signInUser);

	app.route(rootUrl + '/users/signout').post(
		validateRequest,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.userSignOut);
		},
		signOutUser
	);
};

export default usersRoutes;
