import express from './config/express';
import { connect } from './config/db';
import logger from './config/logger';

const app = express();
const port = process.env.PORT || 4941;

// Connect to MySQL on start
async function main() {
	try {
		await connect();
		app.listen(port, () => {
			logger.info('Listening on port: ' + port);
		});
	} catch (err) {
		logger.error('Unable to connect to MySQL.');
		process.exit(1);
	}
}

main().catch((err) => logger.error(err));
