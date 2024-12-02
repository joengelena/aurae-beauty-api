import { Request, Response } from 'express';
import logger from '../../../config/logger';
import { VERIFIED } from '../../resources/constants';

function verifyCsrfToken(req: Request) {
	try {
		logger.info('Verifying csrf token');
		const validCsrfToken = req.cookies.csrfToken;
		const reqHeaderCsrfToken = req.headers['x-csrf-token'];

		if (!validCsrfToken || !reqHeaderCsrfToken) {
			return {
				status: 401,
				statusMessage: 'Unauthorized: No csrf token provided',
			};
		}

		if (validCsrfToken !== reqHeaderCsrfToken) {
			return {
				status: 401,
				statusMessage: 'Unauthorized: Invalid csrf token',
			};
		}

		logger.info('Verified csrf token');
		return VERIFIED;
	} catch (error) {
		return {
			status: 401,
			statusMessage: 'Unauthorized: Invalid csrf token',
		};
	}
}

export default verifyCsrfToken;
