import { Request, Response } from 'express';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';

const getPublicDressById = async (req: Request, res: Response): Promise<void> => {
	const dressId = parseInt(req.params.id as string, 10);

	if (isNaN(dressId)) {
		throw new AppError(400, 'Invalid dress ID');
	}

	logger.info(`Getting public dress with id '${dressId}'`);

	const dress = await dressRepository.getPublicDressById(dressId);

	if (!dress) {
		throw new AppError(404, 'Dress not found');
	}

	res.status(200).json(dress);
};

export default getPublicDressById;
