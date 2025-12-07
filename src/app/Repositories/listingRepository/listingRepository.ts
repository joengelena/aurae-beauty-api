import { ResultSetHeader, RowDataPacket } from 'mysql2';
import mysql from 'mysql2/promise';
import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import {
	Listing,
	ListingAttribute,
	ListingPhoto,
	ListingQueryParams,
} from '../../resources/types';
import mapListingAttributesDbToObject from './mapListingAttributesDbToObject';
import buildGetAllListingsQuery from './buildGetAllListingsQuery';
import mapListingsDbToObject from './mapListingsDbToObject';

const listingDbFields: Partial<Record<keyof Listing, string>> = {
	id: 'id',
	userIdFk: 'user_id_fk',
	status: 'status',
	viewCount: 'view_count',
	previewImgUrl: 'preview_img_url',
	imageUrls: 'image_urls',
	location: 'location',
	vehicleCondition: 'vehicle_condition',
	originalPrice: 'original_price',
	discountedPrice: 'discounted_price',
	uploadDate: 'upload_date',
	description: 'description',
	endDate: 'end_date',
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

async function getListingAttributes(): Promise<ListingAttribute[]> {
	logger.info('Getting listing attributes from the database');

	const connection = await getPool().getConnection();
	const query = 'SELECT * FROM listing_attribute';
	const [result] = await connection.query<RowDataPacket[]>(query);
	connection.release();

	return mapListingAttributesDbToObject(result);
}

async function getAllListings(
	allQueries: Partial<ListingQueryParams>
): Promise<{
	data: Listing[];
	pageNumber: number;
	totalPages: number;
	totalRows: number;
}> {
	const connection = await getPool().getConnection();
	const { query, values, limit } = buildGetAllListingsQuery(allQueries);
	const [result] = await connection.query<RowDataPacket[]>(query, values);
	connection.release();

	const totalRows = result[0]?.totalRows ?? 0;

	result.forEach((listing) => {
		delete listing.totalRows;
	});

	const totalPages = Math.ceil(totalRows / limit);

	return {
		data: mapListingsDbToObject(result),
		pageNumber: Number(allQueries.pageNumber),
		totalPages,
		totalRows,
	};
}

async function getListingById(
	id: string,
	connection?: mysql.Pool | mysql.PoolConnection
): Promise<Listing[]> {
	logger.info(`Getting listing with id '${id}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || (await getPool().getConnection());
	// const query = 'SELECT * FROM listing WHERE id = ?';
	const query = `SELECT *
				FROM (
					SELECT
					l.*,
					COALESCE(JSON_ARRAYAGG(lp.photo_path), JSON_ARRAY()) AS image_urls
					FROM motorix_db.listing l
					LEFT JOIN (
						SELECT * FROM motorix_db.listing_photo ORDER BY photo_order
					) lp ON l.id = lp.listing_id_fk
					GROUP BY l.id
				) AS result
				WHERE id = ?`;
	const [result] = await conn.query<RowDataPacket[]>(query, [id]);

	if (!useProvidedConnection) {
		(conn as mysql.PoolConnection).release();
	}

	return mapListingsDbToObject(result);
}

async function postListing(
	listingData: Omit<Listing, 'id'>,
	connection?: mysql.Pool | mysql.PoolConnection
) {
	logger.info('Adding new listing');

	const today = new Date();
	const uploadDate = `${today.getFullYear()}-${String(
		today.getMonth() + 1
	).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	const fields = ['upload_date'];
	const values = [uploadDate];

	for (const [key, value] of Object.entries(listingData)) {
		fields.push(`${listingDbFields[key as keyof Listing]}`);
		values.push(value.toString());
	}

	const useProvidedConnection = !!connection;
	const conn = connection || (await getPool().getConnection());
	const query = `INSERT INTO listing (${fields.join(', ')})
					values (${values.map(() => '?').join(', ')})`;
	const [result] = await conn.query<ResultSetHeader>(query, values);

	if (!useProvidedConnection) {
		(conn as mysql.PoolConnection).release();
	}

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

async function postListingPhotoPaths(
	listingId: number,
	photoPaths: string[],
	connection: mysql.Pool | mysql.PoolConnection
): Promise<ResultSetHeader> {
	logger.info(
		`Batch adding ${photoPaths.length} photo paths for listing id: ${listingId}`
	);

	if (photoPaths.length === 0) {
		throw new Error('No photo paths provided for batch insert');
	}

	// Build batch insert query
	const values = photoPaths.flatMap((path, index) => [
		listingId,
		index,
		path,
	]);
	const placeholders = photoPaths.map(() => '(?, ?, ?)').join(', ');

	const query = `INSERT INTO listing_photo (listing_id_fk, photo_order, photo_path)
                 VALUES ${placeholders}`;

	const [result] = await connection.query<ResultSetHeader>(query, values);

	return result;
}

async function deleteListingWithId(
	id: string,
	connection?: mysql.Pool | mysql.PoolConnection
) {
	logger.info(`Deleting listing with id '${id}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || (await getPool().getConnection());
	const query = 'DELETE FROM listing WHERE id = ?';
	const [result] = await conn.query<ResultSetHeader>(query, [id]);

	if (!useProvidedConnection) {
		(conn as mysql.PoolConnection).release();
	}

	return result;
}

async function updateListingWithId(
	id: string,
	updateValues: Omit<Partial<Listing>, 'id' | 'userIdFk'>,
	connection?: mysql.Pool | mysql.PoolConnection
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

	const useProvidedConnection = !!connection;
	const conn = connection || (await getPool().getConnection());
	const query = `UPDATE listing SET ${fields.join(', ')} WHERE id = ?`;

	values.push(id);

	const [result] = await conn.query<ResultSetHeader>(query, values);

	if (!useProvidedConnection) {
		(conn as mysql.PoolConnection).release();
	}

	return result;
}

async function incrementViewCount(id: string): Promise<ResultSetHeader> {
	logger.info(`Incrementing view count for listing id '${id}'`);

	const connection = await getPool().getConnection();
	const query = 'UPDATE listing SET view_count = view_count + 1 WHERE id = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [id]);
	connection.release();

	return result;
}

async function deleteListingPhotos(
	listingId: number,
	connection: mysql.Pool | mysql.PoolConnection
): Promise<ResultSetHeader> {
	logger.info(`Deleting all photo paths for listing id: ${listingId}`);

	const query = 'DELETE FROM listing_photo WHERE listing_id_fk = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [listingId]);

	return result;
}

export {
	getListingAttributes,
	getAllListings,
	getListingById,
	postListing,
	postListingPhotoPath,
	postListingPhotoPaths,
	deleteListingWithId,
	deleteListingPhotos,
	updateListingWithId,
	incrementViewCount,
};
