import { Express } from 'express';
import { rootUrl } from './base.routes';
import {
	postBusiness,
	getMyBusiness,
	getBusinessMembers,
	deleteBusinessMember,
	postInvite,
	getInvites,
	deleteInvite,
	postRedeemInvite,
} from '../controllers/businessController';
import validateRequestBody from '../middlewares/validateRequestBody';
import ajvSchema from '../resources/ajvSchema.json';
import supabaseAuthenticateReq from '../middlewares/supabaseAuthenticateReq';
import { asyncHandler } from '../utils/asyncHandler';

const businessRoutes = (app: Express) => {
	app.route(rootUrl + '/business')
		.post(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.createBusiness);
			},
			asyncHandler(postBusiness)
		);

	app.route(rootUrl + '/business/mine')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getMyBusiness)
		);

	app.route(rootUrl + '/business/invites/redeem')
		.post(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.redeemInvite);
			},
			asyncHandler(postRedeemInvite)
		);

	app.route(rootUrl + '/business/:businessId/members')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getBusinessMembers)
		);

	app.route(rootUrl + '/business/:businessId/members/:userId')
		.delete(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(deleteBusinessMember)
		);

	app.route(rootUrl + '/business/:businessId/invites')
		.get(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(getInvites)
		)
		.post(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.createInvite);
			},
			asyncHandler(postInvite)
		);

	app.route(rootUrl + '/business/:businessId/invites/:id')
		.delete(
			supabaseAuthenticateReq,
			(req, res, next) => {
				validateRequestBody(req, res, next, ajvSchema.userIdOnly);
			},
			asyncHandler(deleteInvite)
		);
};

export default businessRoutes;
