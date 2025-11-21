import { UserVehicle } from '../../resources/types';
import { RowDataPacket } from 'mysql2';

function mapVehicleDbToObject(vehiclesDb: RowDataPacket[]): UserVehicle[] {
	return vehiclesDb.map((vehicle) => {
		return {
			id: vehicle.id,
			userIdFk: vehicle.user_id_fk,
			make: vehicle.make,
			model: vehicle.model,
			year: vehicle.year,
			licensePlate: vehicle.license_plate,
			color: vehicle.color,
			fuelType: vehicle.fuel_type,
			transmission: vehicle.transmission,
			odometerReading: vehicle.odometer_reading,
			odometerUnit: vehicle.odometer_unit,
			regoExpiryDate: vehicle.rego_expiry_date,
			wofExpiryDate: vehicle.wof_expiry_date,
			vehiclePhotoUrl: vehicle.vehicle_photo_url,
			purchaseDate: vehicle.purchase_date,
			notes: vehicle.notes,
			createdAt: vehicle.created_at,
			updatedAt: vehicle.updated_at,
		};
	});
}

export default mapVehicleDbToObject;
