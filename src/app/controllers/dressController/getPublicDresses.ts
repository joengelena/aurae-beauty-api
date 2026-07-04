import { Request, Response } from 'express';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';

const getPublicDresses = async (req: Request, res: Response): Promise<void> => {
	const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);
	const pageNumber = Math.max(parseInt(req.query.pageNumber as string, 10) || 1, 1);
	const offset = (pageNumber - 1) * limit;
	const userId = (req.query.userId as string) || undefined;
	const startDate = (req.query.startDate as string) || undefined;
	const endDate = (req.query.endDate as string) || undefined;

	try {
		const { dresses, totalRows } = await dressRepository.getPublicDresses(limit, offset, userId, startDate, endDate);
		const totalPages = Math.ceil(totalRows / limit);

		res.status(200).json({
			data: dresses,
			totalRows,
			pageNumber,
			totalPages,
		});
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		logger.error(`Error fetching public dresses: ${error.message}`);
		throw new AppError(500, 'Failed to fetch dresses');
	}
};

export default getPublicDresses;
