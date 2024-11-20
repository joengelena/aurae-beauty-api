import { Express } from 'express';
import { rootUrl } from './base.routes';
import { signUpUser, signInUser } from '../controllers/user.controller';

const usersRoutes = (app: Express) => {
	app.route(rootUrl + '/users/signup').post(signUpUser);

	app.route(rootUrl + '/users/signin').post(signInUser);
};

export default usersRoutes;
