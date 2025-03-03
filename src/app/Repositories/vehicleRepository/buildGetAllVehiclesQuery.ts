import { constants } from 'buffer';
import { testQuery } from '../../resources/types';
import logger from '../../../config/logger';

const MAX_PAGE_LIMIT = 100;
const MIN_PAGE_LIMIT = 10;
const DEFAULT_PAGE_LIMIT = 20;

type BetweenFilterCondition = {
	key: keyof testQuery;
	column: string;
	operator: string;
};

type EqualFilterCondition = {
	key: keyof testQuery;
	column: string;
};

type QueryAndValue = {
	query: string;
	values: (string | number)[];
};

function buildGetAllVehiclesQuery(allQueries: Partial<testQuery>) {
	let query = 'SELECT *, COUNT(*) OVER() AS totalRows FROM vehicle_listing';
	let queryValues: (string | number)[] = [];

	const searchQuery = buildSearchQuery(allQueries);
	const betweenFilterQuery = buildBetweenFilterQuery(allQueries);
	const equalFilterQuery = buildEqualFilterQuery(allQueries);
	const sortByQuery = buildSortByQuery(allQueries);
	const paginationQuery = buildPaginationQuery(allQueries);

	const whereClause = [];
	if (searchQuery.query.length > 0) {
		whereClause.push(searchQuery.query);
		queryValues.push(...searchQuery.values);
	}

	if (betweenFilterQuery.query.length > 0) {
		whereClause.push(betweenFilterQuery.query);
		queryValues.push(...betweenFilterQuery.values);
	}

	if (equalFilterQuery.query.length > 0) {
		whereClause.push(equalFilterQuery.query);
		queryValues.push(...equalFilterQuery.values);
	}

	if (whereClause.length > 0) {
		query += ` WHERE ${whereClause.join(' AND ')}`;
	}

	if (sortByQuery.query.length > 0) {
		query += ` ${sortByQuery.query}`;
		queryValues.push(...sortByQuery.values);
	}

	if (paginationQuery.query.length > 0) {
		query += ` ${paginationQuery.query}`;
		queryValues.push(...paginationQuery.values);
	}

	return {
		query: query,
		values: queryValues,
		limit: Number(paginationQuery.values[0]),
		currentPage: Number(paginationQuery.values[1]) + 1,
	};
}

function buildSearchQuery(allQueries: Partial<testQuery>): QueryAndValue {
	if (allQueries['searchString'] !== undefined) {
		return {
			query: 'make LIKE ? OR model LIKE ? OR location LIKE ? OR body_type LIKE ? OR color LIKE ? OR transmission LIKE ? OR drive_type LIKE ?',
			values: [
				`%${allQueries['searchString']}%`,
				`%${allQueries['searchString']}%`,
				`%${allQueries['searchString']}%`,
				`%${allQueries['searchString']}%`,
				`%${allQueries['searchString']}%`,
				`%${allQueries['searchString']}%`,
				`%${allQueries['searchString']}%`,
			],
		};
	}

	return {
		query: '',
		values: [],
	};
}

function buildBetweenFilterQuery(
	allQueries: Partial<testQuery>
): QueryAndValue {
	const betweenFilterConditions: BetweenFilterCondition[] = [
		{ key: 'priceFrom', column: 'price', operator: '>=' },
		{ key: 'priceTo', column: 'price', operator: '<=' },
		{ key: 'yearFrom', column: 'year', operator: '>=' },
		{ key: 'yearTo', column: 'year', operator: '<=' },
		{ key: 'kilometersFrom', column: 'kilometers', operator: '>=' },
		{ key: 'kilometersTo', column: 'kilometers', operator: '<=' },
		{ key: 'seatsFrom', column: 'seats', operator: '>=' },
		{ key: 'seatsTo', column: 'seats', operator: '<=' },
		{ key: 'doorsFrom', column: 'doors', operator: '>=' },
		{ key: 'doorsTo', column: 'doors', operator: '<=' },
		{ key: 'engineSizeFrom', column: 'engine_size', operator: '>=' },
		{ key: 'engineSizeTo', column: 'engine_size', operator: '<=' },
	];

	const subQueryParts: string[] = [];
	const queryInputValues: string[] = [];

	betweenFilterConditions.forEach(({ key, operator, column }) => {
		if (allQueries[key] !== undefined) {
			subQueryParts.push(`${column} ${operator} ?`);
			queryInputValues.push(allQueries[key]);
		}
	});

	if (subQueryParts.length > 0) {
		return {
			query: `${subQueryParts.join(' AND ')}`,
			values: queryInputValues,
		};
	}

	return { query: '', values: [] };
}

function buildEqualFilterQuery(allQueries: Partial<testQuery>): QueryAndValue {
	const equalFilterConditions: EqualFilterCondition[] = [
		{ key: 'userIdFk', column: 'user_id_fk' },
		{ key: 'location', column: 'location' },
		{ key: 'vehicleCondition', column: 'vehicle_condition' },
		{ key: 'uploadDate', column: 'upload_date' },
		{ key: 'make', column: 'make' },
		{ key: 'model', column: 'model' },
		{ key: 'fuelType', column: 'fuel_type' },
		{ key: 'bodyType', column: 'body_type' },
		{ key: 'driveType', column: 'drive_type' },
		{ key: 'color', column: 'color' },
		{ key: 'transmission', column: 'transmission' },
	];

	const subQueryParts: string[] = [];
	const queryInputValues: string[] = [];

	equalFilterConditions.forEach(({ key, column }) => {
		if (allQueries[key] !== undefined) {
			subQueryParts.push(`${column} = ?`);
			queryInputValues.push(allQueries[key]);
		}
	});

	if (subQueryParts.length > 0) {
		return {
			query: `${subQueryParts.join(' AND ')}`,
			values: queryInputValues,
		};
	}

	return { query: '', values: [] };
}

function buildSortByQuery(allQueries: Partial<testQuery>): QueryAndValue {
	const sortByConditions = [
		{ key: 'priceDesc', column: 'price', order: 'DESC' },
		{ key: 'priceAsc', column: 'price', order: 'ASC' },
		{ key: 'uploadDateDesc', column: 'upload_date', order: 'DESC' },
		{ key: 'uploadDateAsc', column: 'upload_date', order: 'ASC' },
		{ key: 'kilometersDesc', column: 'kilometers', order: 'DESC' },
		{ key: 'kilometersAsc', column: 'kilometers', order: 'ASC' },
		{ key: 'yearDesc', column: 'year', order: 'DESC' },
		{ key: 'yearAsc', column: 'year', order: 'ASC' },
		{ key: 'endDateDesc', column: 'end_date', order: 'DESC' },
		{ key: 'endDateAsc', column: 'end_date', order: 'ASC' },
	];

	if (allQueries['sortBy'] !== undefined) {
		const sortBy = sortByConditions.find(
			(condition) => condition.key === allQueries['sortBy']
		);

		if (sortBy) {
			return {
				query: `ORDER BY ${sortBy.column} ${sortBy.order}`,
				values: [],
			};
		}
	}

	return { query: '', values: [] };
}

function buildPaginationQuery(allQueries: Partial<testQuery>): QueryAndValue {
	let limit = Number(allQueries['limit']);
	let pageNumber = Number(allQueries['pageNumber']);

	if (
		Number.isNaN(limit) ||
		limit < MIN_PAGE_LIMIT ||
		limit > MAX_PAGE_LIMIT
	) {
		limit = DEFAULT_PAGE_LIMIT;
	}

	if (Number.isNaN(pageNumber) || pageNumber < 0) {
		pageNumber = 0;
	}

	return {
		query: 'LIMIT ? OFFSET ?',
		values: [limit, pageNumber * limit],
	};
}

export default buildGetAllVehiclesQuery;
