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
	getDressAttributes,
} from '../controllers/dressController';
import { postBooking, postSelfBooking, getBookingsByDressId, deleteBooking, getAllUserBookings, getMyBookings, getPublicDressBookings } from '../controllers/rentalBookingController';
import { postIncident, getIncidentsByDressId, patchIncident, deleteIncident, getPublicIncidentsByDressId } from '../controllers/dressDamageIncidentController';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import supabaseAuthenticateReq from '../middlewares/supabaseAuthenticateReq';
import { asyncHandler } from '../utils/asyncHandler';
import uploadMulter from '../utils/multerStorage';

const dressRoutes = (app: Express) => {
	// Public browse endpoints — no auth required
	app.route(rootUrl + '/dresses')
		.get(asyncHandler(getPublicDresses));

	// Must be registered before /dresses/:id so 'attributes' isn't captured as an id
	app.route(rootUrl + '/dresses/attributes')
		.get(asyncHandler(getDressAttributes));

	app.route(rootUrl + '/dresses/:id')
		.get(asyncHandler(getPublicDressById));

	app.route(rootUrl + '/dresses/:id/bookings')
		.get(asyncHandler(getPublicDressBookings));

	app.route(rootUrl + '/dresses/:id/damage-incidents')
		.get(asyncHandler(getPublicIncidentsByDressId));

	app.route(rootUrl + '/dresses/:id/book')
		.post(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.selfBook);
			},
			asyncHandler(postSelfBooking)
		);

	app.route(rootUrl + '/user/dresses')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getAllDresses)
		)
		.post(
			uploadMulter.array('images', 10),
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
			uploadMulter.array('images', 10),
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

	// Damage incident history for a specific dress
	app.route(rootUrl + '/user/dresses/:id/damage-incidents')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getIncidentsByDressId)
		)
		.post(
			uploadMulter.array('images', 5),
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.postDamageIncident);
			},
			asyncHandler(postIncident)
		);

	app.route(rootUrl + '/user/dresses/:id/damage-incidents/:incidentId')
		.patch(
			uploadMulter.array('images', 5),
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.patchDamageIncident);
			},
			asyncHandler(patchIncident)
		)
		.delete(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(deleteIncident)
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

	// My bookings as a renter
	app.route(rootUrl + '/user/my-bookings')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getMyBookings)
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
