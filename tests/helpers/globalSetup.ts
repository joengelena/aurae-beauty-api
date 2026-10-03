import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { dbToolPath, loadTestEnv, pgConnectionConfig } from './testEnv';

// Same order postgresql-db-tool uses (src/database.js): init, then base-seed,
// then test-seed. Each folder's index.js lists its files in execution order.
const SQL_FOLDERS = ['init', 'base-seed', 'test-seed'];

function readSqlFolder(folder: string): string {
	const dbFolder = process.env.SHINE_DB_FOLDER || 'shine';
	const folderPath = path.join(dbToolPath(), 'sql', dbFolder, folder);
	const manifestPath = path.join(folderPath, 'index.js');

	if (!fs.existsSync(manifestPath)) {
		throw new Error(
			`Cannot find ${manifestPath}. Set SHINE_DB_TOOL_PATH to your postgresql-db-tool checkout.`
		);
	}

	// tslint:disable-next-line:no-var-requires
	const executionOrder: string[] = require(manifestPath);
	return executionOrder
		.map((file) => fs.readFileSync(path.join(folderPath, file), 'utf8'))
		.join('\n\n');
}

/**
 * Drops and recreates the dedicated test database, then builds the schema and
 * seed data from the sibling postgresql-db-tool repo. Never touches any other
 * database: the name is forced by loadTestEnv().
 */
export default async function globalSetup(): Promise<void> {
	const { testDatabase } = loadTestEnv();

	const admin = new Client(
		pgConnectionConfig(process.env.POSTGRES_ADMIN_DATABASE || 'postgres')
	);
	await admin.connect();
	try {
		await admin.query(
			'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
			[testDatabase]
		);
		await admin.query(`DROP DATABASE IF EXISTS "${testDatabase}"`);
		await admin.query(`CREATE DATABASE "${testDatabase}"`);
	} finally {
		await admin.end();
	}

	const client = new Client(pgConnectionConfig(testDatabase));
	await client.connect();
	try {
		for (const folder of SQL_FOLDERS) {
			try {
				await client.query(readSqlFolder(folder));
			} catch (error: any) {
				throw new Error(`Building ${testDatabase} failed in sql/${folder}: ${error.message}`);
			}
		}
	} finally {
		await client.end();
	}
}
