import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

let pool: mysql.Pool = null;

const connect = async () => {
	pool = mysql.createPool({
		// Might have to get ride of the limitation of 100 connections
		connectionLimit: 100,
		multipleStatements: true,
		host: process.env.MYSQL_HOST,
		user: process.env.MYSQL_USER,
		password: process.env.MYSQL_PASSWORD,
		database: process.env.MYSQL_DATABASE,
		port: 3306,
	});
	logger.info(`Created pool`);
	await pool.getConnection(); // Check connection
	logger.info(`Successfully connected to database`);
	return;
};

const getPool = () => {
	return pool;
};

export { connect, getPool };
