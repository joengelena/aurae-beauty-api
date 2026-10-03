// Runs before every unit test file. Unit tests never need a database or the
// network; they only need the config the app reads at import time.
import { applyDummyEnv } from './testEnv';

applyDummyEnv();

// tslint:disable-next-line:no-var-requires
const logger = require('../../src/config/logger').default;
logger.silent = process.env.TEST_LOGS !== '1';
