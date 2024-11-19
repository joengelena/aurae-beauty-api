import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import logger from '../../config/logger';
import { Response } from 'express';

const ajv = new Ajv({ removeAdditional: 'all', strict: false });
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

function requestIsValid(schema: object, data: any, res: Response) {
	const validation = validate(schema, data);

	if (!validation) {
		res.status(400).send({
			message: `Invalid request: ${validation.toString()}`,
		});
		return false;
	}
	return true;
}

export default requestIsValid;
