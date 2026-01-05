import { Express } from 'express';
import { rootUrl } from './base.routes';
import {
	getAllVehicles,
	getVehicleById,
	postVehicle,
	patchVehicle,
	deleteVehicle,
} from '../controllers/vehicleController';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import supabaseAuthenticateReq from '../middlewares/supabaseAuthenticateReq';
import { asyncHandler } from '../utils/asyncHandler';
import uploadMulter from '../utils/multerStorage';
import { CACHE_PRESETS } from '../middlewares/cacheControl';

const vehicleRoutes = (app: Express) => {
	// Protected routes - no caching for user-specific data
	app.route(rootUrl + '/user/vehicles')
		.get(
			CACHE_PRESETS.noCache,
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
			CACHE_PRESETS.noCache,
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
};

export default vehicleRoutes;
