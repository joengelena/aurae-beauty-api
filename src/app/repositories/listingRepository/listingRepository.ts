import { Pool, PoolClient, QueryResult } from 'pg';
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
import { convertQueryPlaceholders } from '../../utils/database/queryHelper';

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

	const connection = getPool();
	const query = convertQueryPlaceholders('SELECT * FROM "listing_attribute"');
	const result = await connection.query(query);

	return mapListingAttributesDbToObject(result.rows);
}

async function getAllListings(
	allQueries: Partial<ListingQueryParams>,
): Promise<{
	data: Listing[];
	pageNumber: number;
	totalPages: number;
	totalRows: number;
}> {
	const connection = getPool();
	const { query, values, limit } = buildGetAllListingsQuery(allQueries);

	const result = await connection.query(
		convertQueryPlaceholders(query),
		values,
	);

	const totalRows = result.rows[0]?.total_rows ?? 0;

	result.rows.forEach((listing) => {
		delete listing.total_rows;
	});

	const totalPages = Math.ceil(totalRows / limit);

	return {
		data: mapListingsDbToObject(result.rows),
		pageNumber: Number(allQueries.pageNumber),
		totalPages,
		totalRows,
	};
}

async function getListingById(
	id: string,
	connection?: Pool | PoolClient,
): Promise<Listing[]> {
	logger.info(`Getting listing with id '${id}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	// const query = 'SELECT * FROM "listing" WHERE id = ?';
	const query = convertQueryPlaceholders(`SELECT *
				FROM (
					SELECT
					l.*,
					COALESCE(JSON_AGG(lp.photo_path), '[]'::json) AS image_urls
					FROM "listing" l
					LEFT JOIN (
						SELECT * FROM "listing_photo" ORDER BY photo_order
					) lp ON l.id = lp.listing_id_fk
					GROUP BY l.id
				) AS result
				WHERE id = ?`);
	const result = await conn.query(query, [id]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return mapListingsDbToObject(result.rows);
}

async function postListing(
	listingData: Omit<Listing, 'id'>,
	connection?: Pool | PoolClient,
): Promise<QueryResult> {
	logger.info('Adding new listing');

	const today = new Date();
	const uploadDate = `${today.getFullYear()}-${String(
		today.getMonth() + 1,
	).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	const fields = ['upload_date'];
	const values = [uploadDate];

	for (const [key, value] of Object.entries(listingData)) {
		fields.push(`${listingDbFields[key as keyof Listing]}`);
		values.push(value.toString());
	}

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query =
		convertQueryPlaceholders(`INSERT INTO "listing" (${fields.join(', ')})
					values (${values.map(() => '?').join(', ')}) RETURNING id`);
	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function postListingPhotoPath(
	listingPhotoData: ListingPhoto,
): Promise<QueryResult> {
	logger.info(
		`Adding new listing photo path for listing id: ${listingPhotoData.listingIdFk} photo order: ${listingPhotoData.photoOrder}`,
	);

	const connection = getPool();
	const query = convertQueryPlaceholders(
		'INSERT INTO "listing_photo" values (?, ?, ?)',
	);
	const result = await connection.query(query, [
		listingPhotoData.listingIdFk,
		listingPhotoData.photoOrder,
		listingPhotoData.photoPath,
	]);

	return result;
}

async function postListingPhotoPaths(
	listingId: number,
	photoPaths: string[],
	connection: Pool | PoolClient,
): Promise<QueryResult> {
	logger.info(
		`Batch adding ${photoPaths.length} photo paths for listing id: ${listingId}`,
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

	const query =
		convertQueryPlaceholders(`INSERT INTO "listing_photo" (listing_id_fk, photo_order, photo_path)
                 VALUES ${placeholders}`);

	const result = await connection.query(query, values);

	return result;
}

async function deleteListingWithId(
	id: string,
	connection?: Pool | PoolClient,
): Promise<QueryResult> {
	logger.info(`Deleting listing with id '${id}' from the database`);

	const useProvidedConnection = !!connection;
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		'DELETE FROM "listing" WHERE id = ?',
	);
	const result = await conn.query(query, [id]);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function updateListingWithId(
	id: string,
	updateValues: Omit<Partial<Listing>, 'id' | 'userIdFk'>,
	connection?: Pool | PoolClient,
): Promise<QueryResult> {
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
	const conn = connection || getPool();
	const query = convertQueryPlaceholders(
		`UPDATE "listing" SET ${fields.join(', ')} WHERE id = ?`,
	);

	values.push(id);

	const result = await conn.query(query, values);

	if (!useProvidedConnection && 'release' in conn) {
		(conn as PoolClient).release();
	}

	return result;
}

async function incrementViewCount(id: string): Promise<QueryResult> {
	logger.info(`Incrementing view count for listing id '${id}'`);

	const connection = getPool();
	const query = convertQueryPlaceholders(
		'UPDATE "listing" SET view_count = view_count + 1 WHERE id = ?',
	);
	const result = await connection.query(query, [id]);

	return result;
}

async function deleteListingPhotos(
	listingId: number,
	connection: Pool | PoolClient,
): Promise<QueryResult> {
	logger.info(`Deleting all photo paths for listing id: ${listingId}`);

	const query = convertQueryPlaceholders(
		'DELETE FROM "listing_photo" WHERE listing_id_fk = ?',
	);
	const result = await connection.query(query, [listingId]);

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
