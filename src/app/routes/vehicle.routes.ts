import { Express } from 'express';
import { rootUrl } from './base.routes';
import validateRequest from '../middlewares/requestAuthentication/validateRequest';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import {
	postVehicle,
	updateVehicleLising,
	getVehicleListing,
} from '../controllers/vehicleController';

const vehicleRoutes = (app: Express) => {
	app.route(rootUrl + '/vehicles')
		.get((req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		})
		.post(
			validateRequest,
			(req, res, next) => {
				validateRequestBody(
					req,
					res,
					next,
					ajvSchema.postVehicleListing
				);
			},
			postVehicle
		);

	app.route(rootUrl + '/vehicles/:id')
		.get((req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		}, getVehicleListing)
		.patch(
			validateRequest,
			(req, res, next) => {
				validateRequestBody(
					req,
					res,
					next,
					ajvSchema.updateVehicleListing
				);
			},
			updateVehicleLising
		)
		.delete(validateRequest, (req, res, next) => {
			validateRequestBody(req, res, next, ajvSchema.emptyBody);
		});
};

export default vehicleRoutes;
