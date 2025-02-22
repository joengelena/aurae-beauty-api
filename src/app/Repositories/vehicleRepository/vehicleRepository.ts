import { getPool } from '../../../config/db';
import logger from '../../../config/logger';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import {
	VehicleListingDBSchema,
	Vehicle,
	VehicleFilters,
	Pagination,
	VehicleSortBy,
	VehiclePhoto,
} from '../../resources/types';
import buildGetAllVehiclesQuery from './buildGetAllVehiclesQuery';

const vehicleDatabaseFields: Record<
	keyof Vehicle,
	keyof VehicleListingDBSchema
> = {
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

async function getAllVehicles(
	filters: VehicleFilters,
	sortby: VehicleSortBy,
	pagination: Pagination
) {
	logger.info('Getting all vehicles from the database');

	const connection = await getPool().getConnection();
	const query = buildGetAllVehiclesQuery(filters, sortby, pagination);
	const [result] = await connection.query<RowDataPacket[]>(query);
	connection.release();

	return result as VehicleListingDBSchema[];
}

async function getVehicleById(id: string) {
	logger.info(`Getting vehicle with id '${id}' from the database`);

	const conneciton = await getPool().getConnection();
	const query = 'SELECT * FROM vehicle_listing WHERE id = ?';
	const [result] = await conneciton.query<RowDataPacket[]>(query, [id]);
	conneciton.release();

	return result as VehicleListingDBSchema[];
}

async function postVehicle(vehicleData: Omit<Vehicle, 'id'>) {
	logger.info('Adding new vehicle');

	const fields = [];
	const values = [];

	for (const [key, value] of Object.entries(vehicleData)) {
		fields.push(`${vehicleDatabaseFields[key as keyof Vehicle]}`);
		values.push(value);
	}

	const connection = await getPool().getConnection();
	const query = `INSERT INTO vehicle_listing (${fields.join(', ')}) 
					values (${values.map(() => '?').join(', ')})`;
	const [result] = await connection.query<ResultSetHeader>(query, values);
	connection.release();

	return result;
}

async function postVehiclePhotoPath(vehiclePhotoData: VehiclePhoto) {
	logger.info(
		`Adding new vehicle photo path for vehicle id: ${vehiclePhotoData.vehicleListingIdFk} photo order: ${vehiclePhotoData.photoOrder}`
	);

	const connection = await getPool().getConnection();
	const query = 'INSERT INTO vehicle_photo values (?, ?, ?)';
	const [result] = await connection.query<ResultSetHeader>(query, [
		vehiclePhotoData.vehicleListingIdFk,
		vehiclePhotoData.photoOrder,
		vehiclePhotoData.photoPath,
	]);
	connection.release();

	return result;
}

async function deleteVehicleWithId(id: string) {
	logger.info(`Deleting vehicle with id '${id}' from the database`);

	const connection = await getPool().getConnection();
	const query = 'DELETE FROM vehicle_listing WHERE id = ?';
	const [result] = await connection.query<ResultSetHeader>(query, [id]);
	connection.release();

	return result;
}

async function updateVehicleWithId(
	id: string,
	updateValues: Omit<Partial<Vehicle>, 'id' | 'userIdFk'>
) {
	logger.info(`Updating vehicle with id '${id}' in the database`);

	if (Object.keys(updateValues).length === 0) {
		logger.error('Trying to update vehicle with no update values');
		throw new Error('Empty vehicle update fields');
	}

	const fields = [];
	const values = [];

	for (const [key, value] of Object.entries(updateValues)) {
		fields.push(`${vehicleDatabaseFields[key as keyof Vehicle]} = ?`);
		values.push(value);
	}

	const connection = await getPool().getConnection();
	const query = `UPDATE vehicle_listing SET ${fields.join(
		', '
	)} WHERE id = ?`;

	values.push(id);

	const [result] = await connection.query<ResultSetHeader>(query, values);
	connection.release();

	return result;
}

export {
	getAllVehicles,
	getVehicleById,
	postVehicle,
	postVehiclePhotoPath,
	deleteVehicleWithId,
	updateVehicleWithId,
};
