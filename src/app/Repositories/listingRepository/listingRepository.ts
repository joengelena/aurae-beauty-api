import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import {
	Listing,
	ListingFilters,
	ListingPhoto,
	testQuery,
} from '../../resources/types';
import mapListingFiltersDbToObject from './mapListingFiltersDbToObject';
import buildGetAllListingsQuery from './buildGetAllListingsQuery';
import mapListingDbToObject from './mapListingDbToObject';

const listingDbFields: Record<keyof Listing, string> = {
	id: 'id',
	userIdFk: 'user_id_fk',
	location: 'location',
	vehicleCondition: 'vehicle_condition',
	price: 'price',
	uploadDate: 'upload_date',
	description: 'description',
	endDate: 'end_date',
	endTime: 'end_time',
	make: 'make',
	model: 'model',
	year: 'year',
	kilometers: 'kilometers',
	fuelType: 'fuel_type',
	bodyType: 'body_type',
	driveType: 'drive_type',
	orcIncluded: 'orc_included',
	numberPlate: 'number_plate',
	seats: 'seats',
	doors: 'doors',
	previousOwners: 'previous_owners',
	color: 'color',
	engineSize: 'engine_size',
	transmission: 'transmission',
	cylinders: 'cylinders',
	regoExpiryDate: 'rego_expiry_date',
	wofExpiryDate: 'wof_expiry_date',
};

async function getListingFilters(): Promise<ListingFilters[]> {
	logger.info('Getting filters from the database');

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM listing_filters';
	const [result] = await connection.query<RowDataPacket[]>(query);
	connection.release();

	return mapListingFiltersDbToObject(result);
}

async function getAllListings(allQueries: Partial<testQuery>): Promise<{
	data: Listing[];
	currentPage: number;
	totalPages: number;
	totalRows: number;
}> {
	logger.info('Getting all listings from the database');

	const connection = await getPool().getConnection();
	const { query, values, limit, currentPage } =
		buildGetAllListingsQuery(allQueries);

	const [result] = await connection.query<RowDataPacket[]>(query, values);
	connection.release();

	const totalRows = result[0]?.totalRows ?? 0;

	result.forEach((listing) => {
		delete listing.totalRows;
	});

	const totalPages = Math.ceil(totalRows / limit);

	return {
		data: mapListingDbToObject(result),
		currentPage,
		totalPages,
		totalRows,
	};
}

async function getListingById(id: string): Promise<Listing[]> {
	logger.info(`Getting listing with id '${id}' from the database`);

	const conneciton = await getPool().getConnection();
	const query = 'SELECT * FROM listing WHERE id = ?';
	const [result] = await conneciton.query<RowDataPacket[]>(query, [id]);
	conneciton.release();

	return mapListingDbToObject(result);
}

async function postListing(listingData: Omit<Listing, 'id'>) {
	logger.info('Adding new listing');

	const fields = [];
	const values = [];

	for (const [key, value] of Object.entries(listingData)) {
		fields.push(`${listingDbFields[key as keyof Listing]}`);
		values.push(value);
	}

	const connection = await getPool().getConnection();
	const query = `INSERT INTO listing (${fields.join(', ')})
					values (${values.map(() => '?').join(', ')})`;
	const [result] = await connection.query<ResultSetHeader>(query, values);
	connection.release();

	return result;
}

async function postListingPhotoPath(listingPhotoData: ListingPhoto) {
	logger.info(
		`Adding new listing photo path for listing id: ${listingPhotoData.listingIdFk} photo order: ${listingPhotoData.photoOrder}`
	);

	const connection = await getPool().getConnection();
	const query = 'INSERT INTO listing_photo values (?, ?, ?)';
	const [result] = await connection.query<ResultSetHeader>(query, [
		listingPhotoData.listingIdFk,
		listingPhotoData.photoOrder,
		listingPhotoData.photoPath,
	]);
	connection.release();

	return result;
}

async function deleteListingWithId(id: string) {
	logger.info(`Deleting listing with id '${id}' from the database`);

	const connection = await getPool().getConnection();
	const query = 'DELETE FROM listing WHERE id = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [id]);
	connection.release();

	return result;
}

async function updateListingWithId(
	id: string,
	updateValues: Omit<Partial<Listing>, 'id' | 'userIdFk'>
) {
	logger.info(`Updating listing with id '${id}' in the database`);

	if (Object.keys(updateValues).length === 0) {
		logger.error('Trying to update listing with no update values');
		throw new Error('Empty listing update fields');
	}

	const fields = [];
	const values = [];

	for (const [key, value] of Object.entries(updateValues)) {
		fields.push(`${listingDbFields[key as keyof Listing]} = ?`);
		values.push(value);
	}

	const connection = await getPool().getConnection();
	const query = `UPDATE listing SET ${fields.join(', ')} WHERE id = ?`;

	values.push(id);

	const [result] = await connection.query<ResultSetHeader>(query, values);
	connection.release();

	return result;
}

export {
	getListingFilters,
	getAllListings,
	getListingById,
	postListing,
	postListingPhotoPath,
	deleteListingWithId,
	updateListingWithId,
};
