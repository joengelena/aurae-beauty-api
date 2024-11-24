import { Express } from 'express';
import { rootUrl } from './base.routes';
import {
	signUpUser,
	signInUser,
	signOutUser,
} from '../controllers/userController';
import validateRequest from '../middlewares/requestAuthentication/validateRequest';

const usersRoutes = (app: Express) => {
	app.route(rootUrl + '/users/signup').post(signUpUser);

	app.route(rootUrl + '/users/signin').post(signInUser);

	app.route(rootUrl + '/users/signout').post(validateRequest, signOutUser);
};

export default usersRoutes;
