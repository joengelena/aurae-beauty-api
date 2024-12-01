import { Request, Response } from 'express';
import logger from '../../../config/logger';

function verifyCsrfToken(req: Request, res: Response) {
	logger.info('Verifying csrf token');

	try {
		const validCsrfToken = req.cookies.csrfToken;
		const reqHeaderCsrfToken = req.headers['x-csrf-token'];

		if (!validCsrfToken || !reqHeaderCsrfToken) {
			res.statusMessage = 'Unauthorized: No csrf token provided';
			res.status(401).send();
		}

		if (validCsrfToken !== reqHeaderCsrfToken) {
			res.statusMessage = 'Unauthorized: Invalid csrf token';
			res.status(401).send();
		}

		logger.info('Verified csrf token');
	} catch (error) {
		res.statusMessage = 'Unauthorized: Invalid csrf token';
		res.status(401).send();
	}
}

export default verifyCsrfToken;
