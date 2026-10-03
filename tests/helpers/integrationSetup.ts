// Runs before every integration test file (setupFilesAfterEnv).
import { loadTestEnv } from './testEnv';

loadTestEnv();

// jest.mock calls are hoisted above the import above, but their factories run
// lazily on first require — by then the env is loaded.
jest.mock('../../src/config/supabase', () => require('./mocks/supabaseMock').createSupabaseMock());
jest.mock('../../src/app/utils/cloudflare/r2Client', () => require('./mocks/r2Mock').createR2ClientMock());

// tslint:disable-next-line:no-var-requires
const logger = require('../../src/config/logger').default;
logger.silent = process.env.TEST_LOGS !== '1';

jest.setTimeout(30000);
