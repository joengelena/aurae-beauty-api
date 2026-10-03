import { Pool } from 'pg';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

let pool: Pool = null;

const connect = async () => {
	pool = new Pool({
		host: process.env.POSTGRES_HOST,
		user: process.env.POSTGRES_USER,
		password: process.env.POSTGRES_PASSWORD,
		database: process.env.POSTGRES_DATABASE,
		port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
		max: 100, // Maximum number of clients in the pool
	});
	logger.info(`Created pool`);
	// Check the connection, then hand the client straight back to the pool.
	// Holding it would permanently shrink the pool by one.
	const client = await pool.connect();
	client.release();
	logger.info(`Successfully connected to database`);
	return;
};

const getPool = () => {
	return pool;
};

export { connect, getPool };
