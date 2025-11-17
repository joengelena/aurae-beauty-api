import { Express } from 'express';
import { rootUrl } from './base.routes';
import { getAllVehicles, postVehicle } from '../controllers/vehicleController';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import supabaseAuthenticateReq from '../middlewares/supabaseAuthenticateReq';
import { asyncHandler } from '../utils/asyncHandler';

const vehicleRoutes = (app: Express) => {
	// Protected routes
	app.route(rootUrl + '/user/vehicles')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getAllVehicles)
		)
		.post(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.postVehicle);
			},
			asyncHandler(postVehicle)
		);
};

export default vehicleRoutes;
