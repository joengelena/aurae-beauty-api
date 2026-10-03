import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export const API_ROOT = path.resolve(__dirname, '..', '..');

// Public base of the (mocked) R2 bucket. Forced so tests can build URLs that
// the app recognises as "ours" (see extractKeyFromUrl in r2Client.ts).
export const TEST_R2_PUBLIC_DOMAIN = 'https://r2.test';

// Values the app reads at import time. Supabase and R2 are mocked in every
// test, so these never reach a network; they only have to exist.
const FORCED_ENV: Record<string, string> = {
	NODE_ENV: 'test',
	SUPABASE_URL: 'http://supabase.invalid',
	SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
	SUPABASE_ANON_KEY: 'test-anon-key',
	R2_ACCOUNT_ID: 'test-account',
	R2_ACCESS_KEY_ID: 'test-access-key',
	R2_SECRET_ACCESS_KEY: 'test-secret-key',
	R2_BUCKET_NAME: 'test-bucket',
	R2_PUBLIC_DOMAIN: TEST_R2_PUBLIC_DOMAIN,
	ALLOWED_COOKIE_ORIGINS: 'http://localhost:8080',
};

/**
 * Sets the dummy config every test needs. Safe without a database.
 */
export function applyDummyEnv(): void {
	for (const [key, value] of Object.entries(FORCED_ENV)) {
		process.env[key] = value;
	}
}

function readDevDatabaseName(): string | undefined {
	const envPath = path.join(API_ROOT, '.env');
	if (!fs.existsSync(envPath)) return undefined;
	return dotenv.parse(fs.readFileSync(envPath)).POSTGRES_DATABASE;
}

/**
 * Loads .env.test, then .env for anything still unset, and ALWAYS points
 * POSTGRES_DATABASE at the throwaway test database. Refuses to run if that
 * name could be the developer's real database.
 */
export function loadTestEnv(): { testDatabase: string } {
	dotenv.config({ path: path.join(API_ROOT, '.env.test') });
	dotenv.config({ path: path.join(API_ROOT, '.env') });

	const testDatabase = process.env.SHINE_TEST_DATABASE || 'shine_test';

	if (!/test/i.test(testDatabase)) {
		throw new Error(
			`Refusing to use '${testDatabase}' as the test database: its name must contain "test" (it is dropped on every run).`
		);
	}
	if (testDatabase === readDevDatabaseName()) {
		throw new Error(
			`Refusing to use '${testDatabase}' as the test database: it is the POSTGRES_DATABASE in .env.`
		);
	}

	process.env.POSTGRES_DATABASE = testDatabase;
	applyDummyEnv();

	return { testDatabase };
}

export function dbToolPath(): string {
	const configured = process.env.SHINE_DB_TOOL_PATH || '../postgresql-db-tool';
	return path.resolve(API_ROOT, configured);
}

export function pgConnectionConfig(database: string) {
	return {
		host: process.env.POSTGRES_HOST,
		port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
		user: process.env.POSTGRES_USER,
		password: process.env.POSTGRES_PASSWORD,
		database,
	};
}
