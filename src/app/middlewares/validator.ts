import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import Logger from '../../config/logger';

const ajv = new Ajv({ removeAdditional: 'all', strict: false });
addFormats(ajv);

async function validate(schema: object, data: any) {
	try {
		const validator = ajv.compile(schema);
		const valid = validator(data);
		if (!valid) {
			Logger.error(validator.errors);
			return false;
		}
		return true;
	} catch (err) {
		Logger.error(err.message);
		return false;
	}
}

export { validate };
