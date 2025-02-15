import { Pagination, Vehicle, VehicleSortBy } from '../../resources/types';

function buildGetAllVehiclesQuery(
	filters: Vehicle,
	sortBy: VehicleSortBy,
	pagination: Pagination = { limit: 20, offset: 0 }
) {
	let query = 'SELECT * FROM vehicle_listing';

	if (Object.keys(filters).length > 0) {
		query += buildFilterQuery(filters);
	}

	if (Object.keys(sortBy).length > 0) {
		query += buildSortByQuery(sortBy);
	}

	query += buildPaginationQuery(pagination);

	return query;
}

function buildFilterQuery(filters: Vehicle): string {
	return '';
}

function buildSortByQuery(sortBy: VehicleSortBy): string {
	return '';
}

function buildPaginationQuery(pagination: Pagination): string {
	return '';
}

export default buildGetAllVehiclesQuery;
