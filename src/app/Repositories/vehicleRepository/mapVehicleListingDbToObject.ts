import { VehicleListing } from '../../resources/types';
import { RowDataPacket } from 'mysql2';

function mapVehicleListingDbToObject(
	vehicleListingsDb: RowDataPacket[]
): VehicleListing[] {
	return vehicleListingsDb.map((vehicleListing) => {
		return {
			id: vehicleListing['id'],
			userIdFk: vehicleListing['user_id_fk'],
			location: vehicleListing['location'],
			vehicleCondition: vehicleListing['vehicle_condition'],
			price: vehicleListing['price'],
			uploadDate: vehicleListing['upload_date'],
			description: vehicleListing['description'],
			endDate: vehicleListing['end_date'],
			endTime: vehicleListing['end_time'],
			make: vehicleListing['make'],
			model: vehicleListing['model'],
			year: vehicleListing['year'],
			kilometers: vehicleListing['kilometers'],
			fuelType: vehicleListing['fuel_type'],
			bodyType: vehicleListing['body_type'],
			driveType: vehicleListing['drive_type'],
			orcIncluded: vehicleListing['orc_included'],
			numberPlate: vehicleListing['number_plate'],
			seats: vehicleListing['seats'],
			doors: vehicleListing['doors'],
			previousOwners: vehicleListing['previous_owners'],
			color: vehicleListing['color'],
			engineSize: vehicleListing['engine_size'],
			transmission: vehicleListing['transmission'],
			cylinders: vehicleListing['cylinders'],
			regoExpiryDate: vehicleListing['rego_expiry_date'],
			wofExpiryDate: vehicleListing['wof_expiry_date'],
		};
	});
}

export default mapVehicleListingDbToObject;
