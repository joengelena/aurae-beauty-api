import { Express } from 'express';
import { rootUrl } from './base.routes';
import { signUpUser } from '../controllers/user.controller';

const usersRoutes = (app: Express) => {
	app.route(rootUrl + '/users/signup').post(signUpUser);
};

export default usersRoutes;
