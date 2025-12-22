import { Express } from 'express';
import { rootUrl } from './base.routes';
import {
	getAllVehicles,
	getVehicleById,
	postVehicle,
	patchVehicle,
	deleteVehicle,
} from '../controllers/vehicleController';
import { postService, getServicesByVehicleId } from '../controllers/vehicleServiceController';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import supabaseAuthenticateReq from '../middlewares/supabaseAuthenticateReq';
import { asyncHandler } from '../utils/asyncHandler';
import uploadMulter from '../utils/multerStorage';

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
			uploadMulter.single('image'),
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.postVehicle);
			},
			asyncHandler(postVehicle)
		);

	app.route(rootUrl + '/user/vehicles/:id')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getVehicleById)
		)
		.patch(
			uploadMulter.single('image'),
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.patchVehicle);
			},
			asyncHandler(patchVehicle)
		)
		.delete(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(deleteVehicle)
		);

	// Get services for a specific vehicle
	app.route(rootUrl + '/user/vehicles/:id/services')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getServicesByVehicleId)
		);

	// Vehicle service routes
	app.route(rootUrl + '/user/vehicle-services')
		.post(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.postVehicleService);
			},
			asyncHandler(postService)
		);
};

export default vehicleRoutes;
