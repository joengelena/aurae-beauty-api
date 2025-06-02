import { Request, Response } from 'express';
import logger from '../../../config/logger';
import * as listingRepository from '../../repositories/listingRepository/listingRepository';
import { v2 as cloudinary } from 'cloudinary';

async function generateUploadSignature(req: Request, res: Response) {
	logger.info(`Generating upload signature`);

	try {
		const timestamp = Math.floor(Date.now() / 1000);
		const signature = cloudinary.utils.api_sign_request(
			{ timestamp, folder: 'motorix' },
			process.env.CLOUDINARY_API_SECRET
		);

		res.status(200)
			.json({
				signature,
				timestamp,
				apiKey: process.env.CLOUDINARY_API_KEY,
				cloudName: process.env.CLOUDINARY_CLOUD_NAME,
			})
			.send();
		return;
	} catch (error) {
		logger.error(
			`Error getting listing with id '${req.params.id}': ${error}`
		);
		res.statusMessage = 'Internal server error';
		res.status(500).send();
		return;
	}
}

export default generateUploadSignature;
