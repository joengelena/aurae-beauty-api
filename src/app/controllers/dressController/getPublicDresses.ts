import { Request, Response } from 'express';
import logger from '../../../config/logger';
import AppError from '../../utils/errors/appError';
import * as dressRepository from '../../repositories/dressRepository/dressRepository';

const getPublicDresses = async (req: Request, res: Response): Promise<void> => {
	const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);
	const pageNumber = Math.max(parseInt(req.query.pageNumber as string, 10) || 1, 1);
	const offset = (pageNumber - 1) * limit;
	const stringParam = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined);

	const filters = {
		userId: stringParam(req.query.userId),
		startDate: stringParam(req.query.startDate),
		endDate: stringParam(req.query.endDate),
		search: stringParam(req.query.q),
		sortBy: stringParam(req.query.sortBy),
		brand: stringParam(req.query.brand),
		style: stringParam(req.query.style),
		dressType: stringParam(req.query.dressType),
		size: stringParam(req.query.size),
		color: stringParam(req.query.color),
		condition: stringParam(req.query.condition),
		location: stringParam(req.query.location),
		priceFrom: stringParam(req.query.priceFrom),
		priceTo: stringParam(req.query.priceTo),
	};

	try {
		const { dresses, totalRows } = await dressRepository.getPublicDresses(limit, offset, filters);
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
