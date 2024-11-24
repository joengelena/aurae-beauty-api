import { Express } from 'express';
import { rootUrl } from './base.routes';
import {
	signUpUser,
	signInUser,
	signOutUser,
} from '../controllers/userController';
import verifyJwt from '../middlewares/verifyJwt';

const usersRoutes = (app: Express) => {
	app.route(rootUrl + '/users/signup').post(signUpUser);

	app.route(rootUrl + '/users/signin').post(signInUser);

	app.route(rootUrl + '/users/signout').post(verifyJwt, signOutUser);
};

export default usersRoutes;
