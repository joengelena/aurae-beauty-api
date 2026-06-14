import { Express } from 'express';
import { rootUrl } from './base.routes';
import {
	getAllDresses,
	getDressById,
	postDress,
	patchDress,
	deleteDress,
	getPublicDresses,
	getPublicDressById,
} from '../controllers/dressController';
import { postBooking, getBookingsByDressId, deleteBooking, getAllUserBookings } from '../controllers/rentalBookingController';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import supabaseAuthenticateReq from '../middlewares/supabaseAuthenticateReq';
import { asyncHandler } from '../utils/asyncHandler';
import uploadMulter from '../utils/multerStorage';

const dressRoutes = (app: Express) => {
	// Public browse endpoints — no auth required
	app.route(rootUrl + '/dresses')
		.get(asyncHandler(getPublicDresses));

	app.route(rootUrl + '/dresses/:id')
		.get(asyncHandler(getPublicDressById));

	app.route(rootUrl + '/user/dresses')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getAllDresses)
		)
		.post(
			uploadMulter.single('image'),
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.postDress);
			},
			asyncHandler(postDress)
		);

	app.route(rootUrl + '/user/dresses/:id')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getDressById)
		)
		.patch(
			uploadMulter.single('image'),
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.patchDress);
			},
			asyncHandler(patchDress)
		)
		.delete(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(deleteDress)
		);

	// Get bookings for a specific dress
	app.route(rootUrl + '/user/dresses/:id/bookings')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getBookingsByDressId)
		);

	// Dress booking routes
	app.route(rootUrl + '/user/dress-bookings')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getAllUserBookings)
		)
		.post(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.postBooking);
			},
			asyncHandler(postBooking)
		);

	app.route(rootUrl + '/user/dress-bookings/:id')
		.delete(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(deleteBooking)
		);
};

export default dressRoutes;
