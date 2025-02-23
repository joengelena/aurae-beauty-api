import {
	Pagination,
	Vehicle,
	VehicleBetweenFilters,
	VehicleEqualFilters,
	VehicleFilters,
	VehicleSortBy,
} from '../../resources/types';

function buildGetAllVehiclesQuery(
	equalFilters: VehicleEqualFilters,
	betweenFilters: VehicleBetweenFilters,
	sortBy: VehicleSortBy,
	pagination: Pagination = { limit: 20, pageNumber: 1 }
) {
	let query = 'SELECT * FROM vehicle_listing WHERE';

	buildFilterQuery(equalFilters, betweenFilters);

	if (Object.keys(sortBy).length > 0) {
		query += buildSortByQuery(sortBy);
	}

	query += buildPaginationQuery(pagination);

	return query;
}

function buildFilterQuery(
	equalFilters: VehicleEqualFilters,
	betweenFilters: VehicleBetweenFilters
) {
	let conditions: string[] = [];

	if (Object.keys(equalFilters).length > 0) {
		conditions.push(buildEqualFilterQuery(equalFilters));
	}

	if (Object.keys(betweenFilters).length > 0) {
		conditions.push(buildBetweenFilterQuery(betweenFilters));
	}

	return conditions.join(' AND ');
}

function buildBetweenFilterQuery(filters: VehicleBetweenFilters): string {
	return Object.keys(filters)
		.map(
			(key) =>
				`${key} BETWEEN ${
					filters[key as keyof VehicleBetweenFilters].from
				} 
                AND ${filters[key as keyof VehicleBetweenFilters].to}`
		)
		.join(' AND ');
}

function buildEqualFilterQuery(filters: VehicleEqualFilters): string {
	return Object.keys(filters)
		.map((key) => `${key} = ${filters[key as keyof VehicleEqualFilters]}`)
		.join(' AND ');
}

function buildSortByQuery(sortBy: VehicleSortBy): string {
	const sortByKey = Object.keys(sortBy)[0] as keyof VehicleSortBy;
	const sortByValue = sortBy[sortByKey];

	return `ORDER BY ${sortByKey} ${sortByValue}`;
}

function buildPaginationQuery(pagination: Pagination): string {
	return `LIMIT ${pagination.limit} OFFSET ${
		(pagination.pageNumber - 1) * pagination.limit
	}`;
}

export default buildGetAllVehiclesQuery;
