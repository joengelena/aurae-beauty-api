import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import logger from '../../config/logger';
import { NextFunction, Response, Request } from 'express';

const ajv = new Ajv({
	removeAdditional: 'all',
	strict: false,
	coerceTypes: true,
});
addFormats(ajv);

function validate(schema: object, data: any) {
	try {
		const validator = ajv.compile(schema);
		const valid = validator(data);
		if (!valid) {
			logger.error(validator.errors);
			return false;
		}
		return true;
	} catch (err) {
		logger.error(err.message);
		return false;
	}
}

function validateRequestBody(
	req: Request,
	res: Response,
	next: NextFunction,
	schema: object
) {
	const validation = validate(schema, req.body);

	if (!validation) {
		res.status(400).send({
			message: 'Invalid request body',
		});
		return;
	}

	logger.info('Validated request body');
	next();
}

export default validateRequestBody;
