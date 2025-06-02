import { Express } from 'express';
import { rootUrl } from './base.routes';
import validateRequest from '../middlewares/requestAuthentication/validateRequest';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import * as cloundinaryController from '../controllers/cloudinaryController/index';

const cloundinaryRoutes = (app: Express) => {
	app.route(rootUrl + '/cloundinary/upload-signature').get(
		validateRequest,
		(req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		},
		cloundinaryController.generateUploadSignature
	);
};

export default cloundinaryRoutes;
